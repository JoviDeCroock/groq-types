export const BUILT_IN_FIELDS = {
  _id: 'string',
  _key: 'string',
  _updatedAt: 'Date',
  _createdAt: 'Date',
  _rev: 'string',
};

export const BASE_TYPES = `
  export type SanityReference = {
    _type: 'reference';
    _ref: string;
  }

  export type SanityFile = {
    _type: 'file',
    asset: SanityReference
  }

  export type SanityGeoPoint = {
    _type: 'geopoint';
    lat: number;
    lng: number;
    alt?: number;
  }

  export type SanityImageCrop = {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }

  export type SanityImageHotspot = {
    x: number;
    y: number;
    height: number;
    width: number;
  }

  export type SanityImageMetadataDimensions = {
    aspectRatio: number;
    height: number;
    width: number;
  }

  export type SanityImageMetadataLocation = SanityGeoPoint;

  export type SanityImageMetadata = {
    lqip: string;
    palette: any;
    dimensions: SanityImageMetadataDimensions;
    location: SanityImageMetadataLocation;
  }

  export type SanityImageAsset = {
    _createdAt: Date;
    _updatedAt: Date;
    _id: string;
    _rev: string;
    _type: "sanity.imageAsset";
    assetId: string;
    extension: svg;
    mimeType: string;
    originalFilename: string;
    path: string;
    sha1hash: string;
    size: number;
    url: string;
    metadata: SanityImageMetadata;
  }

  export type SanityImage = {
    _type: 'image';
    asset: SanityReference | SanityImageAsset;
    crop?: SanityImageCrop;
    hotspot?: SanityImageHotspot
  }

  export type SanitySlug = {
    _type: 'slug';
    current: string;
  }

  export type SanitySpan = {
    _type: 'span',
    marks: string[];
    text: string;
  }

  export type SanityBlock = {
    _key: string;
    _type: 'block';
    style: string;
    children: SanitySpan[];
    markDefs: any[]
  }
`;

export const TYPE_MAP = {
  block: 'SanityBlock', // TODO
  boolean: 'boolean',
  date: 'Date',
  datetime: 'Date',
  file: 'SanityFile',
  geopoint: 'SanityGeoPoint',
  image: 'SanityImage',
  number: 'number',
  reference: 'SanityReference',
  slug: 'SanitySlug',
  string: 'string',
  span: 'SanitySpan',
  text: 'string',
  url: 'string',
};
