# Drafts

Drafts represent primary keyed records that have not yet been saved. Their `id` is optional. If it's `nil` the record has never been inserted, and if non-`nil` then it only hasn't been saved.

## Form features work with drafts

Drafts unify features that want to _create_ a record and features that want to _edit_ a record:

```swift
struct FormView: View {
  @State var draft: Reminder.Draft
  @Dependency(\.defaultDatabase) var database
  var body: some View {
    ...
  }

  func saveButtonTapped() {
    try database.write { db in
      try Reminder.upsert { draft }.execute(db)
    }
  }
}
```

## Upsert to save a draft

```swift
try await database.write { db in
  try Reminder.upsert { draft }.execute(db)
}
```

## Drafts are not `Identifiable` by default

Optional `id` makes `Identifiable` conformance for `Draft` dangerous. Multiple unrelated drafts can have same "identity" if their `id` is `nil`.