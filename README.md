# BĮIP Maps WEB

[![License](https://img.shields.io/github/license/AplinkosMinisterija/biip-maps-web)](https://github.com/AplinkosMinisterija/biip-maps-web/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/AplinkosMinisterija/biip-maps-web)](https://github.com/AplinkosMinisterija/biip-maps-web/issues)
[![GitHub stars](https://img.shields.io/github/stars/AplinkosMinisterija/biip-maps-web)](https://github.com/AplinkosMinisterija/biip-maps-web/stargazers)

This repository contains the source code and documentation for the BĮIP Maps WEB, developed by the Aplinkos
Ministerija.

## Table of Contents

- [About the Project](#about-the-project)
- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)
- [Documentation](#documentation)
  - [Alis](#alis)
  - [Animals](#animals)
  - [Animals Draw](#animals-draw)
  - [Edit](#edit)
  - [Medziokle](#medziokle)
  - [Medziokle Draw](#medziokle-draw)
  - [Hunting tracks](#hunting-tracks)
  - [Nature Management](#nature-management)
  - [Rusys](#rusys)
  - [Smalsuolis](#smalsuolis)
  - [UETK](#uetk)
  - [Zuvinimas](#zuvinimas)
  - [Zuvinimas Draw](#zuvinimas-draw)
  - [Zuvinimas Upcoming](#zuvinimas-upcoming)
  - [Zuvinimas Stats](#zuvinimas-stats)
  - [Types](#types)

## About the Project

The BĮIP Maps WEB is designed to provide maps and it's functionalities for a number of BĮIP projects.

Key features of the WEB include:

- Displaying different maps' layers
- Identifying objects
- Filtering and displaying features

## Getting Started

To get started with the BĮIP Maps WEB, follow the instructions below.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/AplinkosMinisterija/biip-maps-web.git
   ```

2. Install the required dependencies:

   ```bash
   cd biip-maps-web
   yarn install
   ```

### Usage

1. Set up the required environment variables. Copy the `.env.example` file to `.env` and provide the necessary values for the variables.

2. Start the WEB server:

   ```bash
   yarn dev
   ```

The WEB will be available at `http://localhost:5173`.

## Deployment

### Production

To deploy the application to the production environment, create a new GitHub release:

1. Go to the repository's main page on GitHub.
2. Click on the "Releases" tab.
3. Click on the "Create a new release" button.
4. Provide a version number, such as `1.2.3`, and other relevant information.
5. Click on the "Publish release" button.

### Staging

The `main` branch of the repository is automatically deployed to the staging environment. Any changes pushed to the main
branch will trigger a new deployment.

### Development

To deploy any branch to the development environment use the `Deploy to Development` GitHub action.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a
pull request. For more information, see the [contribution guidelines](./CONTRIBUTING.md).

## License

This project is licensed under the [MIT License](./LICENSE).

# Documentation

Maps **listens** for events, that are provided via `window.postMessage(...)` function. And **sends** data that can be listened via `window.addEventListener("message", () => {...})`

## Alis

```
https://maps.biip.lt/alis/fishing
```

### Parameters

| Name           | Desciption                            | Type      | Default |
| -------------- | ------------------------------------- | --------- | ------- |
| `cadastral_id` | Filters and highlighs by cadastral ID | `Filter`  | -       |
| `show_search`  | Enables search                        | `Boolean` | `false` |
| `preview`      | Enables feature sidebar               | `Boolean` | `false` |

### Events

**Sends:**

| Name            | Desciption                                              | Type                           |
| --------------- | ------------------------------------------------------- | ------------------------------ |
| `click`         | Provides click features                                 | Array of items                 |
| `buyPermission` | Provides alis water body data for buying one permission | Object of alis water body data |

## Animals

```
https://maps.biip.lt/animals
```

## Animals draw

```
https://maps.biip.lt/animals/draw
```

### Parameters

| Name               | Desciption                         | Type      | Default |
| ------------------ | ---------------------------------- | --------- | ------- |
| `municipalityCode` | Filters and highlighs municipality | `Filter`  | -       |
| `preview`          | Disables editing                   | `Boolean` | false   |

### Events

**Listens:**

| Name      | Desciption                             | Type                                    |
| --------- | -------------------------------------- | --------------------------------------- |
| `geom`    | Draws provided feature collection      | Feature collection                      |
| `address` | Zooms to provided address + adds point | String (e.g. `Gedimino pr. 1, Vilnius`) |

**Sends:**

| Name          | Desciption              | Type               |
| ------------- | ----------------------- | ------------------ |
| `userObjects` | Provides drawn features | Feature collection |

## Edit

```
https://maps.biip.lt/edit
```

### Parameters

| Name       | Desciption                                | Type                  | Default                                                                                                                                                                   |
| ---------- | ----------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `multi`    | Enables multi geometry                    | `Boolean`             | false                                                                                                                                                                     |
| `buffer`   | Enables buffers to geometry               | `Boolean` \| `String` | false. Possible values: `xs` (default if boolean, starts with 1 m), `sm` (starts with 10 m), `md` (starts with 100 m), `lg` (starts with 500 m), `xl` (starts with 1 km). |
| `preview`  | Disables editing                          | `Boolean`             | false                                                                                                                                                                     |
| `types`    | Enables specific draw types               | `String[]`            | `['point', 'polygon', 'line'`                                                                                                                                             |
| `autoZoom` | Enables auto zoom on change               | `Boolean`             | false                                                                                                                                                                     |
| `measure`  | Enables measurements for lines & polygons | `Boolean`             | false                                                                                                                                                                     |

### Events

**Listens:**

| Name   | Desciption                        | Type               |
| ------ | --------------------------------- | ------------------ |
| `geom` | Draws provided feature collection | Feature collection |

**Sends:**

| Name   | Desciption              | Type               |
| ------ | ----------------------- | ------------------ |
| `data` | Provides drawn features | Feature collection |

## Medziokle

```
https://maps.biip.lt/medziokle
```

### Parameters

| Name     | Desciption                    | Type                                                                             | Default |
| -------- | ----------------------------- | -------------------------------------------------------------------------------- | ------- |
| `mpvId`  | Filters and highlighs MPV     | `Filter`                                                                         | -       |
| `draw`   | Enables draw                  | `Boolean`                                                                        | false   |
| `zoom`   | Defines zoom location         | `{x: number, y: number}`                                                         | -       |
| `points` | Defines points to mark in map | `Array<{x: number, y: number, type?: 'current' \| 'other', [key: string]: any}>` | -       |

### Events

**Listens:**

| Name     | Desciption                    | Type                                                                             |
| -------- | ----------------------------- | -------------------------------------------------------------------------------- |
| `zoom`   | Defines zoom location         | `{x: number, y: number}`                                                         |
| `points` | Defines points to mark in map | `Array<{x: number, y: number, type?: 'current' \| 'other', [key: string]: any}>` |

**Sends:**

| Name       | Desciption              | Type               |
| ---------- | ----------------------- | ------------------ |
| `selected` | Provides selected point | Feature            |
| `data`     | Provides drawn features | Feature collection |

## Medziokle draw

```
https://maps.biip.lt/medziokle/draw
```

### Parameters

| Name      | Desciption                | Type      | Default |
| --------- | ------------------------- | --------- | ------- |
| `mpvId`   | Filters and highlighs MPV | `Filter`  | -       |
| `preview` | Disables editing          | `Boolean` | false   |

### Events

**Listens:**

| Name   | Desciption                        | Type               |
| ------ | --------------------------------- | ------------------ |
| `geom` | Draws provided feature collection | Feature collection |

**Sends:**

| Name   | Desciption              | Type               |
| ------ | ----------------------- | ------------------ |
| `data` | Provides drawn features | Feature collection |

## Hunting Tracks

```
https://maps.biip.lt/hunting/tracks
```

### Parameters

| Name     | Desciption                | Type     | Default |
| -------- | ------------------------- | -------- | ------- |
| `mpv_id` | Filters and highlighs MPV | `Filter` | -       |

### Events

**Sends:**

| Name    | Desciption              | Type           |
| ------- | ----------------------- | -------------- |
| `click` | Provides selected items | Array of items |

## Nature management

```
https://maps.biip.lt/gamtotvarka
```

### Parameters

| Name      | Desciption      | Type      | Default |
| --------- | --------------- | --------- | ------- |
| `preview` | Enables preview | `Boolean` | false   |

## Rusys

```
https://maps.biip.lt/rusys
```

### Parameters

| Name                | Desciption                  | Type         | Default |
| ------------------- | --------------------------- | ------------ | ------- |
| `place`             | Filters places              | `Filter`     | -       |
| `informationalForm` | Filters informational forms | `Filter`     | -       |
| `kingdom`           | Filters kingdoms            | `Filter`     | -       |
| `species`           | Filters species             | `Filter`     | -       |
| `type`              | Switching layers            | `inva\|sris` | -       |
| `auth`              | Defines auth token          | `String`     | -       |
| `preview`           | Enables preview             | `Boolean`    | false   |
| `amateur`           | Enables amateur mode        | `Boolean`    | false   |
| `request`           | Filters by request          | `Number`     | -       |

### Events

**Listens:**

| Name     | Desciption                             | Type               |
| -------- | -------------------------------------- | ------------------ |
| `filter` | Defines filters                        | `Filter`           |
| `geom`   | Highlights provided feature collection | Feature collection |

**Sends:**

| Name            | Desciption                 | Type |
| --------------- | -------------------------- | ---- |
| `selectedForm`  | Provides selected form id  | ID   |
| `selectedPlace` | Provides selected place id | ID   |

## Smalsuolis

```
https://maps.biip.lt/smalsuolis
```

### Events

**Listens:**

| Name      | Desciption                           | Type               |
| --------- | ------------------------------------ | ------------------ |
| `geom`    | Zooms to provided feature collection | Feature collection |
| `filters` | Sets query filters                   | `Filter`           |

## UETK

```
https://maps.biip.lt/uetk
```

### Parameters

| Name          | Desciption              | Type      | Default |
| ------------- | ----------------------- | --------- | ------- |
| `cadastralId` | Filters by cadastral ID | `Filter`  | -       |
| `preview`     | Enables preview         | `Boolean` | false   |

## Zuvinimas

```
https://maps.biip.lt/zuvinimas
```

### Parameters

| Name               | Desciption                   | Type     | Default |
| ------------------ | ---------------------------- | -------- | ------- |
| `id`               | Filters by ID                | `Filter` | -       |
| `createdBy`        | Filters by creator           | `Filter` | -       |
| `userId`           | Filters by user              | `Filter` | -       |
| `stockingCustomer` | Filters by stocking customer | `Filter` | -       |
| `tenantId`         | Filters by tenant            | `Filter` | -       |

### Events

**Sends:**

| Name    | Desciption              | Type           |
| ------- | ----------------------- | -------------- |
| `click` | Provides selected items | Array of items |

## Zuvinimas Draw

```
https://maps.biip.lt/zuvinimas/draw
```

### Parameters

| Name      | Desciption       | Type      | Default |
| --------- | ---------------- | --------- | ------- |
| `id`      | Filters by ID    | `Filter`  | -       |
| `preview` | Disables editing | `Boolean` | false   |

### Events

**Listens:**

| Name          | Desciption                                      | Type                 |
| ------------- | ----------------------------------------------- | -------------------- |
| `geom`        | Draws provided feature collection               | `Feature collection` |
| `cadastralId` | Zooms to provided cadastral object & adds point | `Number` \| `String` |

**Sends:**

| Name          | Desciption                           | Type                                                   |
| ------------- | ------------------------------------ | ------------------------------------------------------ |
| `userObjects` | Provides drawn features              | Feature collection                                     |
| `selected`    | Provides drawn features & UETK items | `{geom: FeatureCollection, items: Array<UEKT object>}` |

## Zuvinimas Upcoming

```
https://maps.biip.lt/zuvinimas/upcoming
```

### Events

**Listens:**
| Name | Desciption | Type |
| ------ | --------------------------------- | ------------------ |
| `zoom` | Zooms to provided feature collection | Feature collection |

## Zuvinimas Stats

```
https://maps.biip.lt/zuvinimas/stats
```

## Types

### Filter

Accepts filters such as:

**Equals**

```
https://maps.biip.lt?field=value
```

**In:**

```
https://maps.biip.lt?field={$in:[1,2]}
```

**Exists:**

```
https://maps.biip.lt?field={$exists:true}
```

**Not exists:**

```
https://maps.biip.lt?field={$exists:false}
```

**Greater than:**

```
https://maps.biip.lt?field={$gt:1}
```

**Greater than or equal:**

```
https://maps.biip.lt?field={$gte:1}
```

**Less than:**

```
https://maps.biip.lt?field={$lt:1}
```

**Less than or equal:**

```
https://maps.biip.lt?field={$lte:1}
```
