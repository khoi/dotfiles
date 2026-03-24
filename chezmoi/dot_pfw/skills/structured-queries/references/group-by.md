# GROUP BY

```swift
Reminder.group(by: \.isCompleted)
Reminder.group { $0.isCompleted }
```

## Aggregations

```swift
Reminder
  .group(by: \.isCompleted)
  .select { $0.id.count() }
```
