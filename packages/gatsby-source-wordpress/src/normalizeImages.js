const _ = require(`lodash`)
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
      console.info(`Element: \n ${element.properties}`)
      const localFile = media.find(
        mObj => element.properties.src === mObj.source_url
      )

      if (localFile) {
      const defaults = {
        maxWidth: 650,
        wrapperStyle: ``,
        backgroundColor: `white`,
        linkImagesToOriginal: true,
        showCaptions: false,
      }

      // const options = _.defaults(pluginOptions, defaults)
      const options = _.defaults(defaults)

      // Call Gatsby Img
      let rawHTML = `
      <span
        class="gatsby-resp-image-wrapper"
        style="position: relative; display: block; ${
          options.wrapperStyle
        }; max-width: 1000px; margin-left: auto; margin-right: auto;"
      >
        <span
          class="gatsby-resp-image-background-image"
          style="padding-bottom: 1rem; position: relative; bottom: 0; left: 0; background-image: url('${
          localFile.fluid.base64
        }'); background-size: cover; display: block;"
        >
          <img
            class="gatsby-resp-image-image"
            style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0; box-shadow: inset 0px 0px 0px 400px ${
              options.backgroundColor
            };"
            alt="${localFile.alt ? localFile.alt : "Im and image"}"
            title="${localFile.title ? localFile.title : ``}"
            src="${fallbackSrc}"
            srcset="${localFile.fluid.srcSet}"
            sizes="${localFile.fluid.sizes}"
          />
        </span>
      </span>
      `
      }

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
  const media = entities.filter(e => e.__type === `wordpress__wp_media`)
  return Promise.all(entities.map(e => normalizeEntity(e, media)));
}

module.exports = normalizeImages;

