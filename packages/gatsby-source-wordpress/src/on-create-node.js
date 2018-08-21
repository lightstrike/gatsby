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
            class="gatsby-resp-image-image ${element.properties.className ? element.properties.className.join(' ') : null}"
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
  if (node.internal.type === 'wordpress__POST') {
    const mediaNodes = getNodes().filter(n => n.internal.type === 'wordpress__wp_media')
    const contentAst = toHast(node.content);
    const targetElements = selectAll('img', contentAst);
    for (let element of targetElements) {
    // await Promise.all(targetElements.map(async (element) => {
      console.info(`Starting: ${element.properties.src}`)
      const mediaNode = mediaNodes.find(m => m.source_url.includes(element.properties.src))
      let fileNode;
      try {
        fileNode = getNode(mediaNode.localFile___NODE)
        console.info(`Node found: ${fileNode.internal.description}`)
      } catch(e) {
        try {
          // For handling relative URLs (ie. `//www.gatsbyjs.org/image.png`)
          const protocolInUrl = element.properties.src.startsWith('http');
          const fetchUrl = protocolInUrl ? element.properties.src : `${options.protocol}:${element.properties.src}`
          fileNode = await createRemoteFileNode({
            url: fetchUrl,
            store,
            cache,
            createNode,
            createNodeId,
          })
          console.info(`Did we make it?`)
          try {
            console.info(`WE DID! ${fileNode.internal.description}`)
          } catch(e) {
            console.log(`Oh no ${element.properties.src} -- ${e} `)
            console.dir(fileNode)
          }
        } catch(e) {
          console.log(`Strange: ${element.properties.src} -- ${e}`);
        }
      }
      if (fileNode) {
        const fluidImages = await fluid({file: fileNode})
        fileNode.fluid = fluidImages;
        element = gatsbyifyImage(element, fileNode)
        // console.info(element.children.find(child => child.tagName === 'img').properties.alt);
      } else {
        console.info(`Bad times: ${element.properties.src}`)
      }
    }
    // }))
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
