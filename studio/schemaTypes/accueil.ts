import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'accueil',
  title: "Page d'accueil",
  type: 'document',
  fields: [
    defineField({name: 'title_line1', title: 'Titre — ligne 1', type: 'string'}),
    defineField({name: 'title_line2', title: 'Titre — ligne 2', type: 'string'}),
    defineField({name: 'title_highlight', title: 'Mot en rouge (dans le titre)', type: 'string'}),
    defineField({name: 'description', title: 'Description (sous le titre)', type: 'text', rows: 3}),
  ],
  preview: {prepare: () => ({title: "Page d'accueil"})},
})
