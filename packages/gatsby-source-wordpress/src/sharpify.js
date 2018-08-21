const { fluid } = require(`gatsby-plugin-sharp`)

exports.onCreateNode = async (
  { node, actions, loadNodeContent, createNodeId },
  options
) => {
  console.info(node.extension)
  console.info(node.absolutePath)
}
