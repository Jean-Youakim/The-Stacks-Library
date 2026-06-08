# Stacks — MongoDB Schema Reference

## Database: `stacks`
Connection: `mongodb+srv://gbmnsx_db_user:...@cluster0.hazumv8.mongodb.net/stacks`

---

## Collections

### `users`
Stores all accounts (admin + regular users).

| Field              | Type     | Notes                             |
|--------------------|----------|-----------------------------------|
| `_id`              | ObjectId | Auto-generated                    |
| `email`            | String   | Unique, lowercase                 |
| `password`         | String   | bcrypt hash (never stored plain)  |
| `role`             | String   | `"user"` or `"admin"`             |
| `profile.name`     | String   | Saved checkout name               |
| `profile.location` | String   | Saved delivery address            |
| `profile.phone`    | String   | Saved phone number                |
| `createdAt`        | Date     | Auto                              |
| `updatedAt`        | Date     | Auto                              |

---

### `books`
The full catalog of books.

| Field         | Type     | Notes                              |
|---------------|----------|------------------------------------|
| `_id`         | ObjectId | Auto-generated                     |
| `title`       | String   | Required                           |
| `author`      | String   | Required                           |
| `year`        | Number   | Publication year                   |
| `genre`       | String   | Required                           |
| `tags`        | [String] | e.g. `["magic","library"]`         |
| `cover`       | String   | CSS gradient or base64/URL image   |
| `description` | String   |                                    |
| `price`       | Number   | USD, 2 decimal places              |
| `stock`       | Number   | Units in stock                     |
| `available`   | Boolean  | `false` when stock hits 0          |
| `favorite`    | Boolean  | Global favorite flag               |
| `rating`      | Number   | Computed average (cached)          |
| `createdAt`   | Date     | Auto                               |
| `updatedAt`   | Date     | Auto                               |

---

### `ratings`
Per-user star ratings for books.

| Field       | Type     | Notes                             |
|-------------|----------|-----------------------------------|
| `_id`       | ObjectId | Auto                              |
| `bookId`    | ObjectId | Ref → `books`                     |
| `userEmail` | String   | lowercase                         |
| `stars`     | Number   | 1–5                               |
| `createdAt` | Date     | Auto                              |

**Unique index:** `(bookId, userEmail)` — one rating per user per book.

---

### `orders`
Customer purchase orders.

| Field              | Type     | Notes                              |
|--------------------|----------|------------------------------------|
| `_id`              | ObjectId | Auto                               |
| `userEmail`        | String   | Buyer's email                      |
| `customer.name`    | String   | Full name                          |
| `customer.location`| String   | Delivery address                   |
| `customer.phone`   | String   | Phone number                       |
| `items[].bookId`   | ObjectId | Ref → `books`                      |
| `items[].title`    | String   | Book title at time of order        |
| `items[].qty`      | Number   |                                    |
| `items[].price`    | Number   | Price per unit at time of order    |
| `total`            | Number   | Order total in USD                 |
| `status`           | String   | `Order Placed` / `Being Prepared` / `Shipped` |
| `createdAt`        | Date     | Placed at                          |
| `updatedAt`        | Date     | Last status change                 |

---

### `conversations`
User ↔ admin support messages.

| Field                  | Type     | Notes                        |
|------------------------|----------|------------------------------|
| `_id`                  | ObjectId | Auto                         |
| `userEmail`            | String   | Unique — one thread per user |
| `messages[].from`      | String   | userEmail or `"admin"`       |
| `messages[].text`      | String   |                              |
| `messages[].timestamp` | Date     |                              |
| `createdAt`            | Date     | Auto                         |
| `updatedAt`            | Date     | Auto                         |

---

### `notifications`
In-app notification flags.

| Field      | Type     | Notes                                                      |
|------------|----------|------------------------------------------------------------|
| `_id`      | ObjectId | Auto                                                       |
| `type`     | String   | `new_message` / `admin_reply` / `new_order` / `order_status` |
| `forEmail` | String   | Recipient                                                  |
| `seen`     | Boolean  | `false` until marked                                       |
| `createdAt`| Date     | Auto                                                       |
