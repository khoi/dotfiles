# iCloud

## How to synchronize a database to iCloud

### Step 1: Prepare Xcode project

Add "iCloud" entitlements to project with CloudKit:

```plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>aps-environment</key>
  <string>development</string>
  <key>com.apple.developer.icloud-container-identifiers</key>
  <array>
    <string>iCloud.{{bundle identitier}}</string>
  </array>
  <key>com.apple.developer.icloud-services</key>
  <array>
    <string>CloudKit</string>
  </array>
</dict>
</plist>
```

  * **DO** make these changes additively if there is already an entitlements file.

Add `UIBackgroundModes` to Info.plist if it already exists with value `remote-notification`:

```plist
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

If Info.plist does not exist, ask user to add this entry.

### Step 2: Configure `SyncEngine`

Update bootstrap function to set up a `SyncEngine`:

```swift
extension DependencyValues {
  mutating func bootstrapDatabase() throws {
    let database = try SQLiteData.defaultDatabase()
    ...
    defaultDatabase = database
    defaultSyncEngine = try SyncEngine(
      for: database,
      tables: RemindersList.self, Reminder.self
    )
  }
}
```

  * An optional `privateTables` argument can be given to specify tables that will not be shared when a root record is shared.
  * An optional `startsImmediately` argument can be given to not start the sync engine immediately. Useful for making synchronization an opt-in/in-app purchase feature.
  * An optional `delegate` method can be given to listen for certain events in the `SyncEngine`.

## Limitations of iCloud sync

* Compound primary keys are not supported
* Unique indexes are not supported (besides primary keys).
* Avoid reserved iCloud keywords for column names:
  * `creationDate`
  * `creatorUserRecordID`
  * `etag`
  * `lastModifiedUserRecordID`
  * `modificationDate`
  * `modifiedByDevice`
  * `recordChangeTag`
  * `recordID`
  * `recordType`

## How to enable iCloud sharing

### Step 1: Update Info.plist

Add a `CKSharingSupported` key to the project's Info.plist with a value of `true` if an Info.plist is already in the project:

```plist
<key>CKSharingSupported</key>
<true/>
```

If Info.plist does not exist, ask user to add this entry.

### Step 2: Hand `CKShare.Metadata` to `SyncEngine`

Update the entry point of the app to implement `windowScene(_:userDidAcceptCloudKitShareWith)` and `scene(_:willConnectTo:options)` methods from `UIWindowSceneDelegate` and invoke `SyncEngine`'s `acceptShare(metadata:)` method. You may have to create an app delegate and scene delegate from scratch:

```swift
import CloudKit
import SQLiteData
import SwiftUI

@main
struct MyApp: App {
  @UIApplicationDelegateAdaptor private var appDelegate: AppDelegate

  init() {
    try! prepareDependencies {
      try $0.bootstrapDatabase()
    }
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

final class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role
    )
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  @Dependency(\.defaultSyncEngine) var syncEngine

  func windowScene(
    _ windowScene: UIWindowScene,
    userDidAcceptCloudKitShareWith cloudKitShareMetadata: CKShare.Metadata
  ) {
    Task {
      try await syncEngine.acceptShare(metadata: cloudKitShareMetadata)
    }
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let cloudKitShareMetadata = connectionOptions.cloudKitShareMetadata
    else { return }
    Task {
      try await syncEngine.acceptShare(metadata: cloudKitShareMetadata)
    }
  }
}
```

  * **ALWAYS** `import CloudKit` if touching CloudKit APIs.
  * If extra logic should be performed after accepting share, perform after `acceptShare(metadata:)` method is called.

## How to share a database record with another iCloud user

Use the `share(record:)` method defined on `SyncEngine` to share the record, and all associations, with another iCloud user, and use `SharedRecord` state to drive the presentation of `CloudSharingView` to present your user with UI for customizing sharing:

```swift
import CloudKit
import SQLiteData

struct MyView: View {
  @Dependency(\.defaultSyncEngine) var syncEngine
  @State var sharedRecord: SharedRecord?

  ...
  var body: some View {
    Button {
      Task {
        sharedRecord = try await syncEngine.share(record: databaseRecord) {
          $0[CKShare.SystemFieldKey.title] = databaseRecord.title
          $0[CKShare.SystemFieldKey.thumbnailImageData] = thumbnailImageData
        }
      }
    } label: {
      Image(systemName: "square.and.arrow.up")
    }
    .sheet(item: $sharedRecord) { sharedRecord in
      CloudSharingView(sharedRecord: sharedRecord)
    }
  }
}
```

  * Only root records can be shared, i.e. records with no foreign keys.
  * Associated records are shared if they are not listed in the `privateTables` argument of `SyncEngine.init` and if they have a single foreign key.

## Prepare database for querying iCloud sync metadata

Invoke the `attachMetadatabase` method in `prepareDatabase` when constructing connection:

```swift
import Dependencies
import SQLiteData

extension DependencyValues {
  mutating func bootstrapDatabase() throws {
    var configuration = Configuration()
    configuration.prepareDatabase { db in
      try db.attachMetadatabase()
      ...
    }
    let database = try SQLiteData.defaultDatabase(configuration: configuration)
    ...
  }
}
```

## Checking the share status of stored records

SQLiteData manages a table `SyncMetadata` with various data that can be used to customize your app.

### Check if a root record is being shared

Use the `syncMetadataID` defined on every primary keyed table to look up a record's `SyncMetadata`:

```swift
let isShared = try await database.read { db in
  SyncMetadata
    .find(remindersList.syncMetadataID)
    .select(\.isShared)
    .fetchOne(db) ?? false
}
```

### Fetch root records with associated sharing information

Join to `SyncMetadata` table to compute share information for each record:

```
import CloudKit
import SQLiteData

@Selection struct Row {
  var remindersList: RemindersList
  var share: CKShare?
}

@FetchAll(
  RemindersList
    .leftJoin(SyncMetadata.all) { $0.syncMetadataID.eq($1.id) }
    .select {
      Row.Columns(remindersList: $0, share: $1.share)
    }
)
var rows
```

## iCloud sharing permissions

Permissions are enforced by the library when writes are made to the database. Catch the error thrown by `database.write` and check its message to see if it is a permission error:

```swift
import SQLiteData

do {
  try await database.write { db in
    Reminder.find(id)
      .update { $0.title = "Personal" }
      .execute(db)
  }
} catch let error as DatabaseError where error.message == SyncEngine.writePermissionError {
  // User does not have permission to write to this record.
}
```

Pre-emptively fetch a root record's `CKShare` to check permissions in order to hide certain interface elements:

```swift
import CloudKit
import SQLiteData

let share = try await database.read { db in
  SyncMetadata
    .find(remindersList.syncMetadataID)
    .select(\.share)
    .fetchOne(db)
    ?? nil
}
guard
  share?.currentUserParticipant?.permission == .readWrite
    || share?.publicPermission == .readWrite
else {
  // User does not have permissions to write to record.
  return
}

// User has permission to write
```

## Common iCloud warnings and errors, and how to fix them

> Error fetching user record ID: <CKUnderlyingError: "BadContainer" (1014); "Couldn't get container configuration from the server for container "iCloud.…"">

Container was just created and not ready. Wait a bit of time in order for the container to propagate in iCloud.

> <CKSyncEngine Private> error updating account info: Error Domain=CKErrorDomain Code=1 "Account signed in, but we don't have the current userRecordID to create an event" UserInfo={NSLocalizedDescription=Account signed in, but we don't have the current userRecordID to create an event}
>
> Error fetching user record ID: <CKUnderlyingError 0x600000c3b7e0: "AccountUnavailableDueToBadAuthToken" (1029/2011); "Account temporarily unavailable due to bad or missing auth token">
>
> SyncEngine error updating userRecordID: <CKError 0x600000c3bab0: "Account Temporarily Unavailable" (36/1029); "Account temporarily unavailable due to bad or missing auth token">
>
> <CKSyncEngine Shared> error fetching changes for context <FetchChangesContext reason=scheduled options=<FetchChangesOptions scope=all group=CKSyncEngine-FetchChanges-Manual groupID=8759C4A57DC8C862)>>: <CKError 0x600000c08720: "Not Authenticated" (9); "Could not determine iCloud account status">

Simulator is logged out of iCloud. Notify user that they must go to settings and log in again. This has to be done once every 24 hours.

> "You need a newer version of {App} to open this, but the required version couldn't be found in the App Store."

Info.plist is missing the `CKSharingSupported`. Add it with a value of `true`.

> Caught error: SQLite error 1: no such table: sqlitedata_icloud_metadata - while executing…

Metadatabase is not attached and so `SyncMetadata` is not queryable. Attach the metadatabase in `prepareDatabase` of your `bootstrapDatabase`.
