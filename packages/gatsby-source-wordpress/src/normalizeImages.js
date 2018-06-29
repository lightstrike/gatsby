const Img = require("gatsby-image");
const fromParse5 = require('hast-util-from-parse5');
const astToHtml = require('hast-util-to-html');
const {selectAll} = require('hast-util-select');
const Parse5 = require('parse5/lib/parser');
const {fluid} = require('gatsby-plugin-sharp');

const parser = new Parse5();

function toHast(html) {
  let p5 = parser.parseFragment(html);
  return fromParse5(p5);
}


/*
// Somewhere (maybe):
'query {
   allWordpressWpMedia {
     edges {
       node {
         localFile {
           absolutePath
         }
         source_url
       }
     }
   }
 }'
 */

async function normalizeEntity(entity, media) {
  if (entity.__type !== 'wordpress__POST' && entity.__type !== 'wordpress__PAGE') {
    return entity;
  }

  const ast = toHast(entity.content);

  selectAll('img[class*=wp-image]', ast)
    .forEach(element => {
      const localFile = media.find(
        mObj => element.properties.src === mObj.source_url
      )
      element.properties.title = 'What An Image!';
      element.properties.alt = 'What An Image!';
    });

  const html = astToHtml(ast);
  entity.content = html;

  return entity;
}

function normalizeImages(entities) {
  /*
  graphql(
    `
      allWordpressWpMedia {
        edges {
          node {
            source_url
            localFile {
              absolutePath
            }
          }
        }
      }
    `).then(result => {
      console.info(result.data)
    }) */
  const eTypes = entities.map(e => e.__type)
  const eSet = new Set(eTypes)
  console.info(eSet)
  const media = entities.filter(e => e.__type === `wordpress__wp_media`)
  console.info(media[0])
  return Promise.all(entities.map(e => normalizeEntity(e, media)));
}

module.exports = normalizeImages;

