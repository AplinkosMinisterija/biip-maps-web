# BĮIP Maps WEB

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/AplinkosMinisterija/biip-maps-web/badge)](https://securityscorecards.dev/viewer/?platform=github.com&org={AplinkosMinisterija}&repo={biip-maps-web})
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
  - [Animals Draw](#animals-draw)
  - [Edit](#edit)
  - [Medziokle](#medziokle)
  - [Medziokle Draw](#medziokle-draw)
  - [Hunting tracks](#hunting-tracks)
  - [Nature Management](#nature-management)
  - [Rusys](#rusys)
  - [UETK](#uetk)
  - [Zuvinimas](#zuvinimas)
  - [Zuvinimas Draw](#zuvinimas-draw)
  - [Types](#types)
  - [Styles](#styles)

## About the Project

The BĮIP Maps WEB is designed to provide information and functionalities related to activities of different water bodies located in Lithuania. It aims to support the management of water bodies.

Key features of the WEB include:

- Retrieving fish stocking data, such as planned fish stockings and historical information.
- Managing fish stocking data.

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

### Events

**Sends:**

| Name    | Desciption              | Type           |
| ------- | ----------------------- | -------------- |
| `click` | Provides click features | Array of items |

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

| Name   | Desciption                        | Type               |
| ------ | --------------------------------- | ------------------ |
| `geom` | Draws provided feature collection | Feature collection |

**Sends:**

| Name          | Desciption              | Type               |
| ------------- | ----------------------- | ------------------ |
| `userObjects` | Provides drawn features | Feature collection |

## Edit

```
https://maps.biip.lt/edit
```

### Parameters

| Name      | Desciption                  | Type       | Default                        |
| --------- | --------------------------- | ---------- | ------------------------------ |
| `multi`   | Enables multi geometry      | `Boolean`  | false                          |
| `buffer`  | Enables buffers to geometry | `Boolean`  | false                          |
| `preview` | Disables editing            | `Boolean`  | false                          |
| `types`   | Enables specific draw types | `String[]` | `['point', 'polygon', 'line']` |

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

| Name     | Desciption                             | Type                                                                             |
| -------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| `filter` | Defines filters                        | `Filter`                                                                         |
| `geom`   | Highlights provided feature collection | Feature collection                                                               |

**Sends:**

| Name            | Desciption                 | Type |
| --------------- | -------------------------- | ---- |
| `selectedForm`  | Provides selected form id  | ID   |
| `selectedPlace` | Provides selected place id | ID   |

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

| Name               | Desciption                   | Type     | Default |
| ------------------ | ---------------------------- | -------- | ------- |
| `id`               | Filters by ID                | `Filter` | -       |
| `createdBy`        | Filters by creator           | `Filter` | -       |
| `userId`           | Filters by user              | `Filter` | -       |
| `stockingCustomer` | Filters by stocking customer | `Filter` | -       |
| `tenantId`         | Filters by tenant            | `Filter` | -       |

### Events

**Listens:**
| Name | Desciption | Type |
| ------ | --------------------------------- | ------------------ |
| `geom` | Draws provided feature collection | Feature collection |

**Sends:**

| Name          | Desciption              | Type               |
| ------------- | ----------------------- | ------------------ |
| `userObjects` | Provides drawn features | Feature collection |

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

## Styles

### Applying styles for draw

Set style for modify, select, draw and draw layer instances:

**setIcon**

Set icon name and additional style main and secondary (for select, editing case) color:

```
.setIcon('animals').setColors('#00ff00', '#ff0000')
```

**setColors**
Set colors for line/polygon/point:

```
setColors(primaryColor, secondaryColor)
```

**setStyles**
All styles can be applied via:

```
setStyles({colors: {primary:  '', secondary: ''}, width: 3, icon: 'name'})
```
