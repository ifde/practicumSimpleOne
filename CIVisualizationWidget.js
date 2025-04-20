window.s_widget_custom = window.s_widget_custom || {};
const queryString = window.location.search;

const urlParams = new URLSearchParams(queryString);

s_widget.setFieldValue('recordId', urlParams.get('sys_id'));

const script = document.createElement('script');
script.src = 'https://unpkg.com/cytoscape/dist/cytoscape.min.js';
script.type = 'text/javascript';
document.head.appendChild(script);

const script1 = document.createElement('script');
script1.src = 'https://unpkg.com/dagre@0.8.5/dist/dagre.min.js';
script1.type = 'text/javascript';
document.head.appendChild(script1);

const script2 = document.createElement('script');
script2.src = 'https://unpkg.com/cytoscape-dagre/cytoscape-dagre.js';
script2.type = 'text/javascript';
document.head.appendChild(script2);

function newHandleButtonClick() {
  s_widget.serverUpdate();
  const text = s_widget.getFieldValue("array");
  const array = JSON.parse(text);
  array.nodes.forEach(node => {
    console.log(node.category);
    console.log(node.position);
  })
  _visualizeMap("cy", array);
}

// Set the click event handler for the button
document.getElementById('myButton').onclick = newHandleButtonClick;

function _visualizeMap(containerId, data) {
  const elements = [];
  
  // Create all nodes with initial positions
  data.nodes.forEach(node => {
    elements.push({
      data: {
        id: node.id,
        label: node.title,
        category: node.category,
        color: node.color,
        sysId: node.sysId,
        href: node.href,
        icon: node.icon,
        image: node.image
      },
      classes: node.color
    });
  });
  
  // Add connections as edges
  data.connections.forEach((conn, index) => {
    elements.push({
      data: {
        id: `edge-${index}`,
        source: conn.source,
        target: conn.target,
        type: conn.type
      },
      classes: conn.type
    });
  });

  // Initialize Cytoscape with a basic layout
  const cy = cytoscape({
    container: document.getElementById(containerId),
    elements,
    style: [
  {
    selector: 'node',
    style: {
      'shape': 'round-rectangle',
      'width': 85,
      'padding': '4px',
      'background-color': '#ffffff',
      'border-color': ele => {
        const color = ele.data('color');
        return color === 'green' ? '#28a745' :
               color === 'red' ? '#dc3545' :
               color === 'orange' ? '#fd7e14' : '#007bff';
      },
      'border-width': 1,
      'background-image': ele => ele.data('image'),
      'background-fit': 'none',
      'background-clip': 'node',
      'background-position-x': '1px',
      'background-position-y': '50%',
      'background-width': '32px',
      'background-height': '32px',
      'background-opacity': 1,

      // Fonts & labels
      'label': ele => `${ele.data('label')}\n${ele.data('category')}`,
      'color': '#2e3238',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 100,
      'font-family': 'Open Sans, sans-serif',
      'font-size': '8px',
      'font-weight': 400
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 1,
      'line-color': '#d2d6dc',
      'target-arrow-color': '#d2d6dc',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8
    }
  },
  {
    selector: 'node.hover',
    style: {
      'background-color': '#f4faff',
      'font-size': '8.5px',
      'cursor': 'pointer'
    }
  }
]
  });

  // Apply custom hierarchical layout
  applyHierarchicalLayout(cy, data);
  
  // Add interaction events
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    if (node.data('href')) {
      window.open(node.data('href'), '_blank');
    }
  });

  cy.on('mouseover', 'node', function(evt) {
    evt.target.style({
      'background-color': '#e6f7ff',
      'font-size': 8.5
    });
  });

  cy.on('mouseout', 'node', function(evt) {
    evt.target.style({
      'background-color': '#fff',
      'font-size': 8
    });
  });

  return cy;
}

function applyHierarchicalLayout(cy, data) {
  // Build relationship maps
  const childrenMap = {}; // Maps parents to their children
  const parentMap = {};   // Maps children to their parents
  const nodesByCategory = {}; // Group nodes by category
  
  // Create maps of node relationships
  data.connections.forEach(conn => {
    if (!childrenMap[conn.source]) childrenMap[conn.source] = [];
    childrenMap[conn.source].push(conn.target);
    
    if (!parentMap[conn.target]) parentMap[conn.target] = [];
    parentMap[conn.target].push(conn.source);
  });
  
  // Group nodes by category (which determines vertical level)
  data.nodes.forEach(node => {
    if (!nodesByCategory[node.category]) nodesByCategory[node.category] = [];
    nodesByCategory[node.category].push(node.id);
  });
  
  // Sort categories by their vertical position (top)
  const categoryLevels = Object.keys(nodesByCategory).map(category => {
    const nodes = data.nodes.filter(n => n.category === category);
    return {
      category: category,
      level: nodes[0].position.top,
      nodes: nodesByCategory[category]
    };
  }).sort((a, b) => a.level - b.level);
  
  // Set initial vertical positions by category
  const verticalSpacing = 150;
  categoryLevels.forEach((level, idx) => {
    const y = 100 + (idx * verticalSpacing);
    level.nodes.forEach(nodeId => {
      cy.getElementById(nodeId).position('y', y);
    });
  });
  
  // First, position nodes without parents (top level)
  const rootNodes = data.nodes.filter(node => !parentMap[node.id] || parentMap[node.id].length === 0);
  const horizontalSpacing = 200;
  
  // Position root nodes evenly
  rootNodes.forEach((node, idx) => {
    const x = 150 + (idx * horizontalSpacing);
    cy.getElementById(node.id).position('x', x);
  });
  
  // Now work down the hierarchy, positioning child nodes
  // Start with the second level from the top
  for (let i = 1; i < categoryLevels.length; i++) {
    const levelNodes = categoryLevels[i].nodes;
    
    // For each node at this level
    levelNodes.forEach(nodeId => {
      const node = cy.getElementById(nodeId);
      const parents = parentMap[nodeId] || [];
      
      if (parents.length === 0) {
        // If no parent, keep its horizontal position
        if (!node.position('x')) {
          // If not already positioned, give it a default position
          node.position('x', 150 + (levelNodes.indexOf(nodeId) * horizontalSpacing));
        }
      } else if (parents.length === 1) {
        // If one parent, position directly below it
        const parentNode = cy.getElementById(parents[0]);
        node.position('x', parentNode.position('x'));
      } else {
        // If multiple parents, center below them
        let totalX = 0;
        parents.forEach(parentId => {
          totalX += cy.getElementById(parentId).position('x');
        });
        node.position('x', totalX / parents.length);
      }
    });
  }
  
  // Now go back to parents and center them over their children
  // Start from the bottom level and work up
  for (let i = categoryLevels.length - 1; i >= 0; i--) {
    const levelNodes = categoryLevels[i].nodes;
    
    levelNodes.forEach(nodeId => {
      const children = childrenMap[nodeId] || [];
      
      if (children.length > 1) {
        // Center parent above multiple children
        let totalX = 0;
        children.forEach(childId => {
          totalX += cy.getElementById(childId).position('x');
        });
        
        cy.getElementById(nodeId).position('x', totalX / children.length);
      } else if (children.length === 1) {
        // Position directly above single child
        const childX = cy.getElementById(children[0]).position('x');
        cy.getElementById(nodeId).position('x', childX);
      }
    });
  }
  
  // Final pass to prevent node overlap within each level
  categoryLevels.forEach(level => {
    const nodesInLevel = level.nodes.map(id => cy.getElementById(id));
    
    // Sort nodes by x position
    nodesInLevel.sort((a, b) => a.position('x') - b.position('x'));
    
    // Check for overlaps and adjust
    for (let i = 1; i < nodesInLevel.length; i++) {
      const prevNode = nodesInLevel[i-1];
      const currentNode = nodesInLevel[i];
      
      const minDistance = 150; // Minimum distance between nodes
      const actualDistance = currentNode.position('x') - prevNode.position('x');
      
      if (actualDistance < minDistance) {
        currentNode.position('x', prevNode.position('x') + minDistance);
      }
    }
  });
  
  // Final centering of the entire graph
  cy.fit();
  cy.center();
}
