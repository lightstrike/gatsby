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
        if (localFile.fluid) {
          const rawHTML = `
          <div
            class="gatsby-image-outer-wrapper"
            style="position: relative; display: block; ${
              options.wrapperStyle
            }; max-width: 1000px; margin-left: auto; margin-right: auto;"
          >
            <div
              class="gatsby-image-wrapper"
              style="padding-bottom: 1rem; position: relative; bottom: 0; left: 0; background-image: url('${
              localFile.fluid.base64
            }'); background-size: cover; display: block;"
            >
              <div style="width: 100%; padding-bottom: ${100 / localFile.fluid.aspectRatio}%;"></div>
              <img
                class="gatsby-resp-image-image ${element.properties.className.join(' ')}"
                style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0; box-shadow: inset 0px 0px 0px 400px ${
                  options.backgroundColor
                };"
                alt="${element.properties.alt ? element.properties.alt : ""}"
                title="${localFile.title ? localFile.title : ``}"
                src="${localFile.fluid.src}"
                srcset="${localFile.fluid.srcSet}"
                sizes="${localFile.fluid.sizes}"
              />
            </div>
          </div>
          `
          const transformed = toHast(rawHTML);
          const childElement = transformed.children.find(child => child.type === 'element');
          element.type = 'element';
          element.tagName = childElement.tagName;
          element.properties = childElement.properties;
          element.children = childElement.children;
        }
      }
    });

  const html = astToHtml(ast);
  entity.content = html;

  return entity;
}

function normalizeImages(entities) {
  const media = entities.filter(e => e.__type === `wordpress__wp_media`)
  return Promise.all(entities.map(e => normalizeEntity(e, media)));
}

module.exports = normalizeImages;

