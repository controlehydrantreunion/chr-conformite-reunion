import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'CHR · Contrôle Hydrant Réunion',
  projectId: 'dhe4ywjr',
  dataset: 'production',
  plugins: [structureTool({
    structure: (S) =>
      S.list()
        .title('Contenu du site')
        .items([
          S.listItem().title('Contact').id('contact')
            .child(S.document().schemaType('contact').documentId('contact')),
          S.listItem().title("Page d'accueil").id('accueil')
            .child(S.document().schemaType('accueil').documentId('accueil')),
        ]),
  })],
  schema: {types: schemaTypes},
})
