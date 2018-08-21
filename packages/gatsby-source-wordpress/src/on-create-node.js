const _ = require(`lodash`);
const { createRemoteFileNode } = require(`gatsby-source-filesystem`)
const { fluid } = require('gatsby-plugin-sharp')
const fromParse5 = require('hast-util-from-parse5');
const astToHtml = require('hast-util-to-html');
const { selectAll } = require('hast-util-select');
const Parse5 = require('parse5/lib/parser');

const parser = new Parse5();

function toHast(html) {
  let p5 = parser.parseFragment(html);
  return fromParse5(p5);
}

function gatsbyifyImage(element, localFile) {
  const defaults = {
    maxWidth: 650,
    wrapperStyle: ``,
    backgroundColor: `white`,
    linkImagesToOriginal: true,
    showCaptions: false // const options = _.defaults(pluginOptions, defaults)

  };
  const options = _.defaults(defaults); // Call Gatsby Img

    const rawHTML = `
      <div
        class="gatsby-image-outer-wrapper"
        style="position: relative; display: block; ${options.wrapperStyle}; max-width: 1000px; margin-left: auto; margin-right: auto;"
      >
        <div
          class="gatsby-image-wrapper"
          style="padding-bottom: 1rem; position: relative; bottom: 0; left: 0; background-image: url('${localFile.fluid.base64}'); background-size: cover; display: block;"
        >
          <div style="width: 100%; padding-bottom: ${100 / localFile.fluid.aspectRatio}%;"></div>
          <img
            class="gatsby-resp-image-image ${element.properties.className.join(' ')}"
            style="width: 100%; height: 100%; margin: 0; vertical-align: middle; position: absolute; top: 0; left: 0; box-shadow: inset 0px 0px 0px 400px ${options.backgroundColor};"
            alt="${element.properties.alt ? element.properties.alt : ""}"
            title="${localFile.title ? localFile.title : ``}"
            src="${localFile.fluid.src}"
            srcset="${localFile.fluid.srcSet}"
            sizes="${localFile.fluid.sizes}"
          />
        </div>
      </div>
      `;
    const transformed = toHast(rawHTML);
    const childElement = transformed.children.find(child => child.type === 'element');
    element.type = 'element';
    element.tagName = childElement.tagName;
    element.properties = childElement.properties;
    element.children = childElement.children;
    return element;
}
/*
 * Available methods: https://github.com/gatsbyjs/gatsby/issues/4120#issuecomment-366725788
 */
module.exports = async (
  { node, actions, getNode, getNodes, store, cache, createNodeId },
  options
) => {
  const { createNode, createNodeField } = actions
  const mediaNodes = getNodes().filter(n => n.internal.type === 'wordpress__wp_media')
  if (node.internal.type === 'wordpress__POST') {
    console.info(`\n\nI'm trying: ${node.title}`)
    const contentAst = toHast(node.content);
    await selectAll('img', contentAst).forEach(async element => {
      console.info(`Starting: ${element.properties.src}`)
      const mediaNode = mediaNodes.find(m => element.properties.src === m.source_url)
      let fileNode;
      try {
        console.info("get the fileNode:\n")
        fileNode = getNode(mediaNode.localFile___NODE)
      } catch(e) {
        console.info(`\n\n\n\n\n\n***Making: ${element.properties.src} \n\n\n\n\n\n\n`)
        try {
          fileNode = await createRemoteFileNode({
            url: element.properties.src,
            store,
            cache,
            createNode,
            createNodeId,
          })
          console.info(`\n%%%%%% WE MADE!!!: ${fileNode.internal.description} %%%%%% \n\n\n\n`)
        } catch(e) {
          console.log(`Strange: ${e}`);
        }
      }
      try {
        console.info(`\nLet's make an image: ${fileNode.internal.description}`)
        const fluidImages = await fluid({file: fileNode})
        fileNode.fluid = fluidImages;
        element = gatsbyifyImage(element, fileNode)
        console.info(element.children.find(child => child.tagName === 'img').properties.alt);
      } catch(e) {
        console.info(`${element.properties.src} -- File node error: ${e}`)
      }
    })
    node.content = astToHtml(contentAst);
  }
  if (node.internal.type === 'wordpress__wp_media') {
    try {
      const fileNode = getNode(node.localFile___NODE)
      if (fileNode) {
        const fluidImages = await fluid({file: fileNode})
        createNodeField({
          node,
          name: 'fluidImages',
          value: fluidImages
        })
      }
    } catch(error) {
      console.error(error);
    }
  }
}
