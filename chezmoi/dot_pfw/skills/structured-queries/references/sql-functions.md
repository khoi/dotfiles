# SQL Functions

## Strings

```swift
$0.title.upper()
$0.title.lower()
$0.title.length()
$0.title.instr("3D")
$0.title.replace(" ", "-")
$0.title.ltrim()
$0.title.ltrim(" \n\t")
$0.title.rtrim()
$0.title.rtrim(" \n\t")
$0.title.trim()
$0.title.trim(" \n\t")
```

## Numbers

```swift
$0.delta.abs()
$0.delta.round()
$0.delta.round(1)
$0.delta.sign()
```

## Data

```swift
$0.title.hex()
$0.bytes.unhex()
```

## Unsupported SQL functions

For any SQL functions not provided by the library you can use a localized application of the `#sql` macro with a safe SQL string:

```swift
#sql("date('now')")
#sql("datetime('now')")
#sql("datetime('now', 'subsec')")
#sql("datetime('now', '-7 days', 'subsec')")
#sql("max(\($0.modifiedAt), datetime('now'))")
```
