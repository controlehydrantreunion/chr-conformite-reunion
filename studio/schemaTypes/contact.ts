import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'contact',
  title: 'Contact',
  type: 'document',
  fields: [
    defineField({name: 'phone', title: 'Téléphone (affiché)', type: 'string'}),
    defineField({name: 'phoneRaw', title: 'Téléphone (chiffres, pour le lien)', type: 'string'}),
    defineField({name: 'email', title: 'Email', type: 'string'}),
    defineField({name: 'address', title: 'Adresse', type: 'string'}),
    defineField({name: 'whatsapp', title: 'WhatsApp (indicatif + numéro)', type: 'string'}),
    defineField({name: 'hours', title: 'Horaires', type: 'string'}),
  ],
  preview: {prepare: () => ({title: 'Contact'})},
})
