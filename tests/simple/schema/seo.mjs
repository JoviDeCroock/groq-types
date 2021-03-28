export default {
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    {
      title: 'Page Title',
      name: 'pageTitle',
      type: 'string',
    },
    {
      title: 'Page Description',
      name: 'pageDescription',
      type: 'string',
    },
  ],
  preview: {
    select: {
      title: 'pageTitle',
    },
  },
};
