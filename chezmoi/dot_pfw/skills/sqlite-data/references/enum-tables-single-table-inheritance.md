# Enum tables and single-table inheritiance

Enum tables allow one to emulate "single-table inheritance" using value types, i.e. the mutually exclusive choice from a finite number of models. Consult with the `pfw-structured-queries/SKILL.md` skill for more information on enum tables.

## Adding an enum table to your app

### Step 1: Design a @Table struct with an inner @Selection enum

A table that represents an attachment to a journal entry that can be either a link, note or image:

```swift
@Table struct Attachment {
  let id: UUID
  var journalEntryID: JournalEntry.ID
  var kind: Kind?

  @CasePathable @Selection
  enum Kind {
    case link(URL)
    case note(String)
    case image(Data)
  }
}
```

  * If using a `SyncEngine`, **DO** model enum value as optional to support backwards compatibility with older schemas when cases are added to enum

### Step 2: Register a migration to create the SQL table

Register migration where database connection is created:

```swift
migrator.registerMigration("Create 'attachments'") { db in
  try #sql("""
    CREATE TABLE "attachments" (
      "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid())",
      "journalEntryID" TEXT NOT NULL REFERENCES "journalEntries"("id") ON DELETE CASCADE,
      "link" TEXT,
      "note" TEXT,
      "image" BLOB
    ) STRICT
    """)
    .execute(db)
  try #sql("""
    CREATE INDEX "index_attachments_on_journalEntryID" ON "attachments"("journalEntryID")
    """)
    .execute(db)
}
```

## Adding a new case to an enum table

### Step 1: Add case to enum

```swift
@Table struct Attachment {
  ...

  @CasePathable @Selection
  enum Kind {
    ...
    case video(Data)
  }
}
```

### Step 2: Register migration to add column

Register migration where database connection is created:

```swift
migrator.registerMigration("Add 'video' column to 'attachments'") { db in
  try #sql("""
    ALTER TABLE "attachments" ADD COLUMN "video" BLOB
    """)
    .execute(db)
}
```

## Advanced schema design

It is possible to embed `@Selection` structs inside the associated values of enum cases. If an attachment's `image` and `video` cases need multiple properties:

```swift
@Table struct Attachment {
  let id: Int
  var journalEntryID: JournalEntry.ID
  var kind: Kind?

  @CasePathable @Selection
  enum Kind {
    case link(URL)
    case note(String)
    case image(Image)
    case image(Video)

    @Selection struct Video {
      @Column("videoURL")
      var url: URL
      @Column("videoFps")
      var fps: Int
    }
    @Selection struct Image {
      @Column("imageCaption")
      var caption: String
      @Column("imageURL")
      var url: URL
    }
  }
}
```

  * **DO** give properties in `@Selection` structs unique column names to disambiguate from other `@Selection` structs used.

```swift
migrator.registerMigration("Create 'attachments'") { db in
  try #sql("""
    CREATE TABLE "attachments" (
      "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid())",
      "journalEntryID" TEXT NOT NULL REFERENCES "journalEntries"("id") ON DELETE CASCADE,
      "link" TEXT,
      "note" TEXT,
      "videoURL" TEXT,
      "videoFps" INT,
      "imageCaption" TEXT,
      "imageURL" TEXT
    ) STRICT
    """)
    .execute(db)
  try #sql("""
    CREATE INDEX "index_attachments_on_journalEntryID" ON "attachments"("journalEntryID")
    """)
    .execute(db)
}
```
