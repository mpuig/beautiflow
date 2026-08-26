# Community library ERD

Render a small lending domain with one-to-many and many-to-many relationships.

**Capability:** render-only specialized family.

```mermaid
erDiagram
    MEMBER ||--o{ LOAN : borrows
    BOOK ||--o{ COPY : includes
    COPY ||--o{ LOAN : appears_in
    AUTHOR }o--o{ BOOK : writes

    MEMBER {
        string member_id
        string display_name
        date joined_on
    }
    BOOK {
        string isbn
        string title
        int publication_year
    }
    COPY {
        string copy_id
        string condition
    }
    LOAN {
        date checked_out
        date due_on
    }
    AUTHOR {
        string author_id
        string name
    }
```

## Rendered output

![Community library ERD rendered by Beautiflow](rendered/05-community-library-erd.svg)

Generated with:

```bash
beautiflow render examples/sources/05-community-library-erd.mmd --format svg --theme nord-light --output examples/rendered/05-community-library-erd.svg
```

## Try it

Keep the live result open:

```bash
beautiflow server examples/sources/05-community-library-erd.mmd
```

Run Beautiflow directly:

```bash
beautiflow render examples/sources/05-community-library-erd.mmd --format svg
```

Or ask an agent with the Beautiflow skill:

```text
Render the library model and check whether the entities and cardinalities are easy to scan.
Use examples/sources/05-community-library-erd.mmd and show me the result.
```
