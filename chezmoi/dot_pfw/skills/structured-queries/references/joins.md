# Joins

```swift
Reminder
  .join(RemindersList.all) { $0.remindersListID.eq($1.id) }
```

* `leftJoin`
* `rightJoin`
* `fullJoin`

## Outer joins optionalize tables

```swift
@Selection struct Row {
  let remindersList: RemindersList
  let reminder: Reminder?
}

RemindersList
  .leftJoin(Reminder.all) { $0.id.eq($1.remindersListID) }
  .select {
    Row.Columns(remindersList: $0, reminder: $1)
  }
```

## Joins introduce a new query builder table argument

```swift
Reminder
  .where(\.isCompleted)
  .join(RemindersList.all) { $0.remindersListID.eq($1.id) }
  .where { reminders, remindersLists in
    !remindersLists.isHidden
  }
```

## Joining to a WHERE query

WHERE clauses in `join(…)` are for main query:

```swift
RemindersList
  .leftJoin(Reminder.where(\.isCompleted)) {
    $0.remindersListID.eq($1.id)
  }

/*
  SELECT *
  FROM "remindersLists"
  LEFT JOIN "reminders" ON "remindersLists"."id" = "reminders"."remindersListsID"
  WHERE "reminders"."isCompleted"
*/
```

* `leftJoin(Reminder.where { … })` **IS NOT** a join to a subquery.
* `leftJoin(Reminder.where { … })` **IS NOT** a join constraint predicate.

## Self-joins

```
enum Referrer: AliasName {}

User
  .leftJoin(User.as(Referrer.self)) { $0.referrerID.eq($1.id) }
```
