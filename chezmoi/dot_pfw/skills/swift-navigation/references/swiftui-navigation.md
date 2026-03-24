# SwiftUINavigation

A `swift-navigation` module dedicated to making SwiftUI's navigation APIs more ergonomic.

## Presenting an item that does not conform to `Identifiable`

SwiftUINavigation provides overloads to SwiftUI's `item`-based presentation APIs that don't require identifiable and simply take an `id` key path (like `ForEach`) instead:

```swift
.sheet(item: $number, id: \.self) { number in
  Text("\(number)")
}
```

A `item:id:` method is defined for `sheet`, `fullscreenCover`, and `popover`, but **not** `navigatinoDestination`.

## Modeling multiple destinations with a single piece of enum state

### Step: Domain modeling

Model all destinations a feature can navigate to in an enum:

```swift
import CasePaths

@CasePathable
enum Destination {
  case deleteRemindersListAlert(RemindersList)
  case editRemindersList(RemindersList)
  case newRemindersList
}
```

  * Use the `pfw-case-paths/SKILL.md` skill to add CasePaths as a dependency.
  * Associated value of each case holds data the destination view needs to be initialized.

### Step 2: Add state to feature

Add state to `@Observable` model if using one:

```swift
var destination: Destination?
```

…or to SwiftUI view:

```swift
@State var destination: Destination?
```

### Step 3: Navigation view modifiers

```swift
.alert(item: $destination.deleteRemindersListAlert) {
  Text("Delete '\($0.title)'?")
} actions: { remindersList in
  Button("Delete", role: .destructive) {
    ...
  }
}
.sheet(item: $destination.editRemindersList) {
  EditRemindersListForm(remindersList: $0)
}
.sheet(isPresented: $destination.newRemindersList) {
  NewRemindersListForm()
}
```

## Alerts and dialogs

### Item presentation

Use simplified APIs that don't juggle separate `isPresented` and `presenting` APIs that introduce invalid states.

```swift
.alert(item: $video) {
  Text($0.title)
} actions: { video in
  Button("Share") {
    model.shareButtonTapped(video: video)
  }
  Button(role: .cancel) {}
} message: {
  Text("If you share \($0.title) it will no longer be private to your phone.")
}
```

> Important: Do not specify `id` parameters for alert/dialog `item` APIs.

## Enums

`swift-navigation` leverages the CasePaths library to add enum support to SwiftUI bindings for form elements and navigation.

Consult the `pfw-case-paths/SKILL.md` skill for more information on case paths.

### Forms

```swift
@CasePathable enum Status {
  case inStock(quantity: Int)
  case outOfStock(isOnBackOrder: Bool)
}

@Binding var status: Status

var body: some View {
  switch status {
  case .inStock:
    $status.inStock.map { $quantity in
      Stepper("Quantity: \(quantity)", value: $quantity)
    }
  case .outOfStock:
    $status.outOfStock.map { $isOnBackOrder in
      Toggle("Is on back order?", isOn: $isOnBackOrder)
    }
  }
}
```

### Navigation

```swift
@CasePathable
enum Destination {
  case addItem
  case edit(Item)
}

@Binding var destination: Destination?

var body: some View {
  ...
  .sheet(isPresented: $destination.add) {
    AddItemView()
  }
  .popover(item: $destination.edit) { item in
    EditItemView(item: item)
  }
}
```
