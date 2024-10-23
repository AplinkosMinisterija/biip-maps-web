// This file is auto-generated by @hey-api/openapi-ts

import type { CancelablePromise } from './core/CancelablePromise';
import { OpenAPI } from './core/OpenAPI';
import { request as __request } from './core/request';
import type { CountiesSearchData, CountiesSearchResponse, CountiesGetData, CountiesGetResponse, CountiesGetWithGeometryData, CountiesGetWithGeometryResponse, MunicipalitiesSearchData, MunicipalitiesSearchResponse, MunicipalitiesGetData, MunicipalitiesGetResponse, MunicipalitiesGetWithGeometryData, MunicipalitiesGetWithGeometryResponse, EldershipsSearchData, EldershipsSearchResponse, EldershipsGetData, EldershipsGetResponse, EldershipsGetWithGeometryData, EldershipsGetWithGeometryResponse, ResidentialAreasSearchData, ResidentialAreasSearchResponse, ResidentialAreasGetData, ResidentialAreasGetResponse, ResidentialAreasGetWithGeometryData, ResidentialAreasGetWithGeometryResponse, StreetsSearchData, StreetsSearchResponse, StreetsGetData, StreetsGetResponse, StreetsGetWithGeometryData, StreetsGetWithGeometryResponse, AddressesSearchData, AddressesSearchResponse, AddressesGetData, AddressesGetResponse, RoomsSearchData, RoomsSearchResponse, RoomsGetData, RoomsGetResponse, ParcelsSearchData, ParcelsSearchResponse, GetHealthHealthGetResponse } from './types.gen';

/**
 * Search for counties with pagination using various filters
 * Search for counties with pagination using various filters such as county codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_County_ A paginated list of counties matching the search criteria.
 * @throws ApiError
 */
export const countiesSearch = (data: CountiesSearchData): CancelablePromise<CountiesSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/counties/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get county by code
 * Retrieve a county by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the county to retrieve
 * @returns County Details of the county with the specified code.
 * @throws ApiError
 */
export const countiesGet = (data: CountiesGetData): CancelablePromise<CountiesGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/counties/{code}',
    path: {
        code: data.code
    },
    errors: {
        404: 'County not found',
        422: 'Validation Error'
    }
}); };

/**
 * Get county with geometry by code
 * Retrieve a county along with its geometry by its unique code. Optionally specify the SRID for the geometry output.
 * @param data The data for the request.
 * @param data.code The code of the county to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns CountyWithGeometry Details of the county with the specified code, including its geometry.
 * @throws ApiError
 */
export const countiesGetWithGeometry = (data: CountiesGetWithGeometryData): CancelablePromise<CountiesGetWithGeometryResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/counties/{code}/geometry',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'County not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for municipalities with pagination using various filters
 * Search for municipalities with pagination using various filters such as municipality codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_Municipality_ A paginated list of municipalities matching the search criteria.
 * @throws ApiError
 */
export const municipalitiesSearch = (data: MunicipalitiesSearchData): CancelablePromise<MunicipalitiesSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/municipalities/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get municipality by code
 * Retrieve a municipality by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the municipality to retrieve
 * @returns Municipality Details of the municipality with the specified code.
 * @throws ApiError
 */
export const municipalitiesGet = (data: MunicipalitiesGetData): CancelablePromise<MunicipalitiesGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/municipalities/{code}',
    path: {
        code: data.code
    },
    errors: {
        404: 'Municipality not found',
        422: 'Validation Error'
    }
}); };

/**
 * Get municipality with geometry by code
 * Retrieve a municipality along with its geometry by its unique code. Optionally specify the SRID for the geometry output.
 * @param data The data for the request.
 * @param data.code The code of the municipality to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns MunicipalityWithGeometry Details of the municipality with the specified code, including its geometry.
 * @throws ApiError
 */
export const municipalitiesGetWithGeometry = (data: MunicipalitiesGetWithGeometryData): CancelablePromise<MunicipalitiesGetWithGeometryResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/municipalities/{code}/geometry',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'Municipality not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for elderships with pagination using various filters
 * Search for elderships with pagination using various filters such as eldership codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_Eldership_ A paginated list of elderships matching the search criteria.
 * @throws ApiError
 */
export const eldershipsSearch = (data: EldershipsSearchData): CancelablePromise<EldershipsSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/elderships/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get eldership by code
 * Retrieve a eldership by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the eldership to retrieve
 * @returns Eldership Details of the eldership with the specified code.
 * @throws ApiError
 */
export const eldershipsGet = (data: EldershipsGetData): CancelablePromise<EldershipsGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/elderships/{code}',
    path: {
        code: data.code
    },
    errors: {
        404: 'Eldership not found',
        422: 'Validation Error'
    }
}); };

/**
 * Get eldership with geometry by code
 * Retrieve a eldership along with its geometry by its unique code. Optionally specify the SRID for the geometry output.
 * @param data The data for the request.
 * @param data.code The code of the eldership to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns EldershipWithGeometry Details of the eldership with the specified code, including its geometry.
 * @throws ApiError
 */
export const eldershipsGetWithGeometry = (data: EldershipsGetWithGeometryData): CancelablePromise<EldershipsGetWithGeometryResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/elderships/{code}/geometry',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'Eldership not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for residential areas with pagination using various filters
 * Search for residential areas with pagination using various filters such as residential area codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_ResidentialArea_ A paginated list of residential areas matching the search criteria.
 * @throws ApiError
 */
export const residentialAreasSearch = (data: ResidentialAreasSearchData): CancelablePromise<ResidentialAreasSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/residential-areas/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get residential area by code
 * Retrieve a residential area by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the residential area to retrieve
 * @returns ResidentialArea Details of the residential area with the specified code.
 * @throws ApiError
 */
export const residentialAreasGet = (data: ResidentialAreasGetData): CancelablePromise<ResidentialAreasGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/residential-areas/{code}',
    path: {
        code: data.code
    },
    errors: {
        404: 'Residential area not found',
        422: 'Validation Error'
    }
}); };

/**
 * Get residential area with geometry by code
 * Retrieve a residential area along with its geometry by its unique code. Optionally specify the SRID for the geometry output.
 * @param data The data for the request.
 * @param data.code The code of the residential area to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns ResidentialAreaWithGeometry Details of the residential area with the specified code, including its geometry.
 * @throws ApiError
 */
export const residentialAreasGetWithGeometry = (data: ResidentialAreasGetWithGeometryData): CancelablePromise<ResidentialAreasGetWithGeometryResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/residential-areas/{code}/geometry',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'Residential area not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for streets with pagination using various filters
 * Search for streets with pagination using various filters such as street codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_Street_ A paginated list of streets matching the search criteria.
 * @throws ApiError
 */
export const streetsSearch = (data: StreetsSearchData): CancelablePromise<StreetsSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/streets/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get street by code
 * Retrieve a street by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the street to retrieve
 * @returns Street Details of the street with the specified code.
 * @throws ApiError
 */
export const streetsGet = (data: StreetsGetData): CancelablePromise<StreetsGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/streets/{code}',
    path: {
        code: data.code
    },
    errors: {
        404: 'Street not found',
        422: 'Validation Error'
    }
}); };

/**
 * Get street with geometry by code
 * Retrieve a street along with its geometry by its unique code. Optionally specify the SRID for the geometry output.
 * @param data The data for the request.
 * @param data.code The code of the street to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns StreetWithGeometry Details of the street with the specified code, including its geometry.
 * @throws ApiError
 */
export const streetsGetWithGeometry = (data: StreetsGetWithGeometryData): CancelablePromise<StreetsGetWithGeometryResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/streets/{code}/geometry',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'Street not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for address with pagination using various filters
 * Search for addresses with pagination using various filters such as address codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_Address_ A paginated list of addresses matching the search criteria.
 * @throws ApiError
 */
export const addressesSearch = (data: AddressesSearchData): CancelablePromise<AddressesSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/addresses/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        geometry_output_format: data.geometryOutputFormat,
        srid: data.srid,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get address by code
 * Retrieve a address by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the address to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns Address Details of the address with the specified code.
 * @throws ApiError
 */
export const addressesGet = (data: AddressesGetData): CancelablePromise<AddressesGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/addresses/{code}',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'Address not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for rooms with pagination using various filters
 * Search for rooms with pagination using various filters such as address codes, feature IDs, name. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_Room_ A paginated list of rooms matching the search criteria.
 * @throws ApiError
 */
export const roomsSearch = (data: RoomsSearchData): CancelablePromise<RoomsSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/rooms/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Get room by code
 * Retrieve a room by its unique code.
 * @param data The data for the request.
 * @param data.code The code of the room to retrieve
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @returns Room Details of the room with the specified code.
 * @throws ApiError
 */
export const roomsGet = (data: RoomsGetData): CancelablePromise<RoomsGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/v1/rooms/{code}',
    path: {
        code: data.code
    },
    query: {
        srid: data.srid,
        geometry_output_format: data.geometryOutputFormat
    },
    errors: {
        404: 'Room not found',
        422: 'Validation Error'
    }
}); };

/**
 * Search for parcels with pagination using various filters
 * Search for parcels with pagination using various filters such as parcel unique numbers, cadastral numbers. Additionally, you can filter by GeoJson, EWKT geometry
 * @param data The data for the request.
 * @param data.requestBody
 * @param data.sortBy
 * @param data.sortOrder
 * @param data.geometryOutputFormat Specify the format for geometry output.
 * @param data.srid A spatial reference identifier (SRID) for geometry output.
 * @param data.cursor Cursor for the next page
 * @param data.size Page size
 * @returns CursorPage_Parcel_ A paginated list of parcels matching the search criteria.
 * @throws ApiError
 */
export const parcelsSearch = (data: ParcelsSearchData): CancelablePromise<ParcelsSearchResponse> => { return __request(OpenAPI, {
    method: 'POST',
    url: '/v1/parcels/search',
    query: {
        sort_by: data.sortBy,
        sort_order: data.sortOrder,
        geometry_output_format: data.geometryOutputFormat,
        srid: data.srid,
        cursor: data.cursor,
        size: data.size
    },
    body: data.requestBody,
    mediaType: 'application/json',
    errors: {
        422: 'Validation Error'
    }
}); };

/**
 * Perform a Health Check
 * Endpoint to perform a healthcheck on. This endpoint can primarily be used Docker
 * to ensure a robust container orchestration and management is in place. Other
 * services which rely on proper functioning of the API service will not deploy if this
 * endpoint returns any other HTTP status code except 200 (OK).
 * Returns:
 * HealthCheck: Returns a JSON response with the health status
 * @returns HealthCheck Return HTTP Status Code 200 (OK)
 * @throws ApiError
 */
export const getHealthHealthGet = (): CancelablePromise<GetHealthHealthGetResponse> => { return __request(OpenAPI, {
    method: 'GET',
    url: '/health',
    errors: {
        503: 'Service Unavailable'
    }
}); };