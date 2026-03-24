# WHERE

```swift
Reminder.where { $0.title.eq("Groceries") }
Reminder.where(\.isCompleted)
Reminder.where { !$0.isCompleted }
```

* **DO NOT** use infix operators for predicates.
* **DO** use named functions: `eq`, `neq`, `is`, `isNot`, `gt`, `gte`, `lt`, `lte`.
* **DO** use `is`/`isNot` for optionals instead of operators like `== nil` or `!= nil`

## Primary keys

```swift
Reminder.find(reminderID)

Tag.find([homeID, workID])
```

* **DO** prefer `find(id)` over `where { $0.id.eq(id) }`

## Dynamic filters

```swift
@State var showCompleted = false

Reminder.where {
  if !showCompleted {
    !$0.isCompleted
  }
}
```
