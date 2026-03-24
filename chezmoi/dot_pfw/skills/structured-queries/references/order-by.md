# ORDER BY

```swift
Reminder.order(by: \.title)
Reminder.order { $0.title }
```

* **DO NOT** use key path API after joining other tables.
* **DO** use key path API before joining other tables.

## Direction/sort

```swift
Reminder.order { $0.title.desc() }
Reminder.order { $0.title.asc(nulls: .last) }
Reminder.order { $0.title.desc(nulls: .first) }
```

* **DO NOT** specify `asc()` unless customizing NULL sorting.

## Multiple columns

```swift
Reminder.order { ($0.isCompleted, $0.title.desc()) }
```

## Expressions

```swift
Reminder.order { $0.title.collate(.nocase) }
Reminder.order { $0.priority.eq(#bind(.high)).desc() }
```

## Dynamic order

### `if` result builder

```swift
@State var isAscending = true
Reminder.order {
  if isAscending {
    $0.title
  } else {
    $0.title.desc()
  }
}
```

### `switch`

```swift
enum Sort {
  case completed
  priority
  title
}
@State var sort: Sort = .priority
Reminder.order {
  switch sort {
  case .priority:
    ($0.isCompleted, $0.priority.desc())
  case .title:
    ($0.isCompleted, $0.title)
  }
}
```

* **NEVER** use ternaries
