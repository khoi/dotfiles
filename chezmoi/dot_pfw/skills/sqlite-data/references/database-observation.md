# Database Observation

## Fetching many rows

```swift
@FetchAll var reminders: [Reminder]
@FetchAll(Reminder.where(\.isCompleted)) var reminders
```

* **DO** omit explicit type annotation when query is provided.

## Fetching a single row/value

```swift
@FetchOne(Reminder.count()) var remindersCount = 0
@FetchOne var firstReminder: Reminder?
```

* Do provide default for non-optional values.

## Fetching data from multiple queries

```swift
@Fetch(RemindersRequest()) var rows = RemindersRequest.Value()

struct RemindersRequest: FetchKeyRequest {
  struct Value {
    var completedReminders: [Reminder] = []
    var incompleteReminders: [Reminders] = []
  }
  func fetch(_ db: Database) throws -> Value {
    try Value(
      completedReminders: Reminder.where(\.isCompleted).fetchAll(db),
      incompleteReminders: Reminder.where { !$0.isCompleted }.fetchAll(db)
    )
  }
}
```

* **DO** use `FetchKeyRequest` when needing to execute multiple database queries for rows that tend to change together.
* **DO** provide defaults for `Value`'s fields and make them `var`.

## Dynamic queries

If arguments are passed to a view's initializer that determines the query run, use the `none` query to prevent fetching eagerly:

```swift
struct FeatureView: View {
  @FetchAll(Reminder.none) var reminders
  @State var remindersListID: RemindersList
  init(remindersListID: RemindersList.ID) {
    _remindersListID = State(wrappedValue: remindersListID)
  }
  …
}
```

> Note: `Row.none` is not necessary for `@Selection` types or `@Fetch`.

And load the query in the `task` view modifier:

```swift
.task {
  await withErrorReporting {
    try await $reminders.load(
      Reminder.where { $0.remindersListID.eq(remindersListID) },
      animation: .default
    )
  }
}
```

If the query further needs to change when state changes in the view, use the `task(id:)` view modifier:

```swift
.task(id: showCompleted) {
  await withErrorReporting {
    try await $reminders.load(
      Reminder.where {
        if !showCompleted {
          !$0.isCompleted
        }
      }
    )
  }
}
```

## Efficiently managing database observation

To pause subscription to database when view is not visible, await the `FetchSubscription`:

```swift
.task {
  await withErrorReporting {
    try await $reminders.load(
      Reminder.where { $0.remindersListID.eq(remindersListID) },
      animation: .default
    )
    .task
  }
}
```

## Animation

Animate changes with the `animation` parameter:

```swift
@FetchAll(animation: .default) var reminders: [Reminder]
```

Add animation to a dynamic query:

```swift
try await $reminders.load(
  Reminder.where(\.isCompleted),
  animation: .default
)
```

## SwiftUI view

```swift
struct RemindersView: View {
  @FetchAll var reminders: [Reminder]
  var body: some View {
    ForEach(reminders) { reminder in
      Text(reminder.title)
    }
  }
}
```

## Observable model

```swift
@Observable final class RemindersModel {
  @ObservationIgnored
  @FetchAll var reminders: [Reminder]
}
struct RemindersView: View {
  let model: RemindersModel
  var body: some View {
    ForEach(model.reminders) { reminder in
      Text(reminder.title)
    }
  }
}
```

## UIKit observation

```swift
import UIKitNavigation

class RemindersViewController: UIViewController {}
  @FetchAll var reminders: [Reminder]
  override func viewDidLoad() {
    super.viewDidLoad() {
    observe { [weak self] in
      guard let self else { return }
      reloadData(reminders)
    }
  }
}
```

* **DO** import UIKitNavigation from our swift-navigation package.
* Refer to the swift-navigation skill for more information.

