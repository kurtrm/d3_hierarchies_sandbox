// Much of this code is adapted from Mike Bostock's collapsible tree on Observable: https://observablehq.com/@d3/collapsible-tree
const treeData = {
   "name": "Eve",
   "value": 15,
   "type": "black",
   "level": "yellow",
   "children": [
      {
         "name": "Cain",
         "value": 10,
         "type": "grey",
         "level": "red"
      },
      {
         "name": "Seth",
         "value": 10,
         "type": "grey",
         "level": "red",
         "children": [
            {
               "name": "Enos",
               "value": 7.5,
               "type": "grey",
               "level": "purple"
            },
            {
               "name": "Noam",
               "value": 7.5,
               "type": "grey",
               "level": "purple"
            }
         ]
      },
      {
         "name": "Abel",
         "value": 10,
         "type": "grey",
         "level": "blue"
      },
      {
         "name": "Awan",
         "value": 10,
         "type": "grey",
         "level": "green",
         "children": [
            {
               "name": "Enoch",
               "value": 7.5,
               "type": "grey",
               "level": "orange"
            }
         ]
      },
      {
         "name": "Azura",
         "value": 10,
         "type": "grey",
         "level": "green"
      }
   ]
};

let height = 1000;
let width = 500;
let dy = 10;
let dx = height / 2; // ?
let margin = {top: 10, right: 120, bottom: 10, left: 40};

// The hierarchy is the foundational data structure
let root = d3.hierarchy(treeData); // the second argument is not required here since the children are already named "children"
// root.x0 = 0;
// root.y0 = dx / 2;
root.descendants().forEach((d, i) => {
   d.id = i;
   d._children = d.children; // Make a separate accessor for _children, since our interactivity will be based on whether a node has children or not
});

// Instantiate links between nodes
let treeLink = d3.linkVertical().x(d => d.x).y(d => d.y+dy)

// d3.tree defines how we want to visualize the hierarchical data
// Could also have done treemap, sunburst, etc.
let tree = d3.tree().nodeSize([.05*width, .2*height])
   .separation((a, b) => {
      return a.parent == b.parent ? 2 : 3;
   });

let svg = d3.select("#wrapper")
   .attr("align", "center")
 .append("svg")
   .attr("height", height)
   .attr("width", width)
   .attr("viewBox", [-margin.left, -margin.top, height, dy])
   .attr("margin-top", "20")
   .style("font", "11px sans-serif")
   .style("user-select", "none");

// We'll have a g for the links and a g for the nodes
let gLinks = svg.append("g")
   .attr("fill", "none")
   .attr("stroke", "#555")
   .attr("stroke-opacity", 0.4)
   .attr("stroke-width", 1.5);

let gNodes = svg.append("g")
      .attr("cursor", "pointer")
      .attr("pointer-events", "all");

function update(clickedNode) {
   // This function will be called initially on page load and each time a node is clicked
   const duration = 250;
   const nodes = root.descendants();
   const links = root.links();
   // We are going to build a tree using the hierarchy
   tree(root);

   let left = root;
   let right = root;

   root.eachBefore(node => {
      if (node.y < left.y) left = node;
      if (node.y < right.y) right = node;
   });

   const width = right.y - left.y + margin.right + margin.left;

   const transition = svg.transition()
      .duration(duration)
      .attr("viewBox", [-margin.left, left.y - margin.top, width, height])

   // We'll have two chunks of code for the nodes and links
   // One to handle the new nodes/links when an event occurs
   // One to handle the exiting nodes/links
   let node = gNodes.selectAll("g")
     .data(nodes, d => d.id); // This binds the nodes based on the "id" accessor instead of by position

   let nodeEnter = node.enter() // This is telling d3 that we want to work on the new nodes
      .append("g") // We'll make each node a "g" that will include the circle and text for each node
      .attr("transform", d => `translate(${clickedNode.x0},${clickedNode.y0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (e, d) => {
         d.children = d.children ? null : d._children; // This swaps the children accessor depending on whether it's collapsed or uncollapsed
         update(d); // Then rebuilds the tree based on whether the change in the data
      });

   // Code to handle nodes being added
   // Remember that when we bind the data with the elements using .data(), d3 creates an "enter", "exit", and "udpate" selection.
   // "Enter" -> The new nodes that will be bound to newly created elements
   // "Exit" -> The elements that were previously bound that no longer exist in the newly bound data
   // "Update" -> The elements that were already bound that were found when the data was bound
   nodeEnter.append("circle")
      .attr("r", 3)
      .attr("fill", d => d._children ? "#555" : "#999")
      .attr("stroke-width", 10);

   nodeEnter.append("text")
      .attr("dy", "0.31rem")
      .attr("y", d => d.depth ? 8 : -10) // Changes position of text based on whether the node is the root or not
      .attr("text-anchor", d => "middle")
      .text(d => d.data.name)
    .clone(true).lower() // OKAY, I understand this now. This clones the text that we appended to g node and all of its attributes so it shows up in the *exact* same place
      // We then modify it so that the text has a "white shadow". This prevents messy line intersections and such. 
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "white");

   const nodeUpdate = node.merge(nodeEnter) // This executes the actual binding of the data to the elements, and the merge ensures the "update" nodes inherit the same
   // attributes and properties as before
      .transition(transition)
      .attr("transform", d => `translate(${d.x},${d.y+dy})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

   const nodeExit = node.exit().transition(transition).remove()
      .attr("transform", d => `translate(${clickedNode.x},${clickedNode.y+dy})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

   const link = gLinks.selectAll("path")
      .data(links, d => d.target.id);

   const linkEnter = link.enter().append("path")
      .attr("d", d => {
         const coords = {x: clickedNode.x0, y: clickedNode.y0+dy};
         return treeLink({source: coords, target: coords});
      });

   link.merge(linkEnter).transition(transition)
      .attr("d", treeLink);

   link.exit().transition(transition).remove()
      .attr("d", d => {
         const coords = {x: clickedNode.x, y: clickedNode.y};
         return treeLink({source: coords, target: coords});
      });

   root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
   });
}

update(root);