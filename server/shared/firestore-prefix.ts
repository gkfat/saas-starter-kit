export function getCollectionPrefix(): 'dev_' | 'prod_' {
  return process.env.APP_ENV === 'production' ? 'prod_' : 'dev_';
}

export function prefixCollection(name: string): string {
  return `${getCollectionPrefix()}${name}`;
}
