import type { SearchOptions, SearchResults } from '@/types';
import { serializeQuery } from '.';
import { rusysApiHost, uetkApiHost } from '../../config';
import type { GEOM_TYPES } from '../constants';
import { getElementFromCoordinates } from '../map';
import { SpeciesTypes } from '../utils';

export function searchUETK(value: string, options?: SearchOptions): Promise<SearchResults> {
  const searchParams = new URLSearchParams({
    populate: 'geom',
    search: value,
  });

  searchParams.append('searchFields[]', 'name');
  searchParams.append('searchFields[]', 'cadastral_id');
  return fetch(`${uetkApiHost}/objects?${searchParams.toString()}${serializeQuery(options)}`)
    .then((data) => data.json())
    .then((data) => {
      return {
        rows: data.rows.map((item: any) => ({
          name: item.name,
          id: item.cadastralId,
          geom: item.geom,
          description: `${item.categoryTranslate} (${item.cadastralId}) - ${item.municipality}`,
        })),
        total: data.total,
      };
    });
}
export function searchRusys(value: string, options?: SearchOptions): Promise<SearchResults> {
  return fetch(`${rusysApiHost}/taxonomies/search?search=${value}&${serializeQuery(options)}`)
    .then((data) => data.json())
    .then((data) => {
      return {
        rows: data.rows.map((item: any) => ({
          id: item?.speciesId,
          name: item?.speciesName,
          nameLatin: item?.speciesNameLatin,
          subtitle: `<i>lot. ${item?.speciesNameLatin}</i> (${SpeciesTypes[item.speciesType]})`,
          description: `${item.kingdomName} > ${item.phylumName} > ${item.className}`,
        })),
        total: data.total,
      };
    });
}

export function searchGeoportal({
  value,
  filters,
  geomTypes,
  options,
}: {
  value: string;
  filters: any[];
  geomTypes?: GEOM_TYPES[];
  options?: SearchOptions;
}): Promise<SearchResults> {
  const mustClauses: any = [
    {
      multi_match: {
        query: value,
        type: options?.fields || 'most_fields',
        fields: [
          'VARDAS^5',
          'VARDAS.folded^5',
          'VARDAS.shingle^5',
          'VARDAS.trigram^3',
          'VARDAS.edge^5',
          'FULL_ADDR',
          'FULL_ADDR.folded',
        ],
        slop: 5,
      },
    },
  ];

  if (geomTypes && geomTypes?.length > 0) {
    mustClauses.push({
      terms: {
        GEOM_TYPE: geomTypes,
      },
    });
  }

  const functionsArray = filters.map((f) => ({
    filter: {
      term: {
        TYPE: f.type,
      },
    },
    weight: f.weight || 1,
  }));

  const query = {
    function_score: {
      query: {
        bool: {
          must: mustClauses,
        },
        functions: functionsArray,
      },
    },
  };

  const page = options?.page || 1;
  const pageSize = options?.pageSize || 10;

  const body = {
    query,
    from: (page - 1) * pageSize,
    size: pageSize,
    sort: [
      '_score',
      {
        GYVSK: 'desc',
      },
      options?.sort || 'VARDAS',
    ],
  };

  return fetch('https://www.geoportal.lt/map/proxy/elasticsearch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'text/plain',
    },
  })
    .then((data) => data.json())
    .then((data: any) => ({
      rows: data?.hits?.hits?.map((item: any) => {
        const source = item._source || {};
        let data: any = {};
        if (source?.geometry?.coordinates?.length) {
          data = getElementFromCoordinates(source?.geometry?.type, source?.geometry?.coordinates);
        }
        return {
          id: item._id,
          x: source.LOCATIONX,
          y: source.LOCATIONY,
          name: source.VARDAS,
          description: source.DESCRIPTIO,
          extent: data?.extent,
          geom: data?.geom,
        };
      }),
      total: data?.took || 0,
    }));
}
