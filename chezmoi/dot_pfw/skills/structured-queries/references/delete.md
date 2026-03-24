# DELETE

## Delete all rows in a table

```swift
Reminder.delete()
```

Equivalent to:

```sql
DELETE FROM "reminders"
```

## Delete a subset of rows

### Using `where`

```swift
Reminder.where(\.isCompleted).delete()
```

Equivalent to:

```sql
DELETE FROM "reminders" WHERE "isCompleted"
```

### Using `find`

```swift
Reminder.find(id).delete()
```

Equivalent to:

```sql
DELETE FROM "reminders" WHERE "id" = ?
```

> Note: The `delete` method never takes arguments:

```swift
Reminder.delete(where: ...)  // Non-existent API
```
