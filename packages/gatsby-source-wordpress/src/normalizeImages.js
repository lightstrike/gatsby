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

async function normalizeEntity(entity) {
  if (entity.__type !== 'wordpress__POST' && entity.__type !== 'wordpress__PAGE') {
    return entity;
  }

  const ast = toHast(entity.content);

  selectAll('img', ast)
    .forEach(element => {
      console.log('>>>>>> ', element);
      element.properties.title = 'What An Image!';
      element.properties.alt = 'What An Image!';
    });

  const html = astToHtml(ast);
  entity.content = html;

  console.log('##########################################\n');
  console.log(html);
  console.log('##########################################\n');

  return entity;
}

async function normalizeImages(entities) {
  return Promise.all(entities.map(normalizeEntity));
}

module.exports = normalizeImages;

