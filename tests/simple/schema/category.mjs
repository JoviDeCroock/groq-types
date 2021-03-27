export default {
  title: "Category",
  name: "Category",
  type: "document",
  fields: [
    {
      title: "Name",
      type: "string",
      name: "name",
      readOnly: true
    },
    {
      title: "Url",
      type: "string",
      name: "url",
      readOnly: true
    },
    {
      title: "Visible",
      type: "boolean",
      name: "visible"
    },
    {
      title: "Id",
      type: "string",
      name: "id",
      hidden: true
    },
    {
      title: "Parent Category",
      type: "reference",
      name: "parentCategory",
      to: [{ title: "Category", type: "category" }],
      hidden: true,
      weak: true
    },
    {
      title: "Categories",
      type: "array",
      name: "categories",
      of: [
        {
          type: "reference",
          to: [{ title: "Category", type: "category" }]
        }
      ],
      hidden: true,
      weak: true
    },
    {
      title: "SEO",
      name: "seo",
      type: "seo"
    },
    {
      title: "Navigation children",
      type: "array",
      name: "navChildren",
      weak: true,
      hidden: true,
      of: [
        {
          type: "reference",
          to: [{ title: "Category", type: "category" }]
        }
      ]
    }
  ],
  preview: {
    select: {
      title: "url",
      subtitle: "id"
    }
  }
};
