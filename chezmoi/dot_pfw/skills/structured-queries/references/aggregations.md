# Aggregations

## Count

```swift
$0.count()  // For primary keyed tables
$0.id.count()
$0.id.count(filter: $0.isCompleted)
$0.name.count(distinct: true)
```

## Other built-in functions

```swift
$0.salary.avg()
$0.id.max()
$0.createdAt.min()
$0.quantity.sum()
$0.price.total()
```
