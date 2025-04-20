/**
 * @typedef DependencyMap
 * @method buildMap()
 * @method _sortElements()
 * @method _createDataObject()
 * @method _calculateStartPosition()
 * @method _calcucalteCenterCanvas()
 * @method _getChildren()
 * @method _getParent()
 * @method _transformNode()
 * @method _getCiById()
 * @method _getCiPositionByCiTypeId()
 * @method _getTableById()
 * @method _getCiTypeById()
 * @method _initStorage()
 * @method _getNodeColor()
 */
class DependencyMap {
    /**
      * @constructor
      * @param {string} nodeId
    */
    constructor(nodeId) {
        this.nodeId = nodeId;
        this.depth = ss.getProperty('model_nesting_definition');
        this.ciStorage = {};
        this.ciPositionStorage = {};
        this.ciTypeStorage = {};
        // EDITS: Added ciClassStorage
        this.ciClassStorage = {};
        this.tableStorage = {};
        this.uniqueRelations = {};
        this.uniqueCategories = {};
        this.uniqueNodes = {};
        this.maxElementsInRow = 0;
    }
    /**
     * build sys_cmdb_ci relation map
     * @return {string} 
    */
    buildMap() {
        const children = this._getChildren();
        const parent = this._getParent();
        const idsCi = [...Object.values(parent.nodes), ...Object.values(children.nodes), this.nodeId].flat();
        this._initStorage(idsCi);
        const data = this._createDataObject();
        data.nodes = this._sortElements(idsCi.map(item => {
            return this._transformNode(item);
        }));
        data.connections = [...children.relations, ...parent.relations];
        setResult(JSON.stringify(data));
        return data;
        
    }
    /**
    * 
    * @param {Array}
    * @returns {Array}
    */
    _sortElements(dataNode) {
        const itemsByNode = {};
        let nodes = [];
        Object.keys(this.uniqueCategories).forEach(item => {
            const dataNodesFilter = dataNode.filter(data_node => data_node.category == item);
            if (dataNodesFilter.length > this.maxElementsInRow) {
                this.maxElementsInRow = dataNodesFilter.length;
            }
            itemsByNode[item] = dataNodesFilter;
        });
        for (const node in itemsByNode) {
            const dataNodesSort = itemsByNode[node].sort((a, b) => {
                if (a.title < b.title) return -1;
                if (a.title > b.title) return 1;
                return 0;
            });
            this._calculateStartPosition(dataNodesSort);
            nodes = [...nodes, ...dataNodesSort];
        }
        return nodes;
    }
    /**
    * 
    * @returns {Object}
    */
    _createDataObject() {
        return {
            success: true,
            nodes: [],
            connections: []
        };
    }
    /**
    * 
    * @param {Array} 
    */
    _calculateStartPosition(array) {
        const STEP = 220;
        const CENTER_CANVAS = this._calcucalteCenterCanvas();
        if (array.length === 1) {
            array[0].position.left = CENTER_CANVAS;
        }
        if (array.length > 1) {
            if (array.length % 2 !== 0) {
                array[0].position.left = CENTER_CANVAS - (STEP * (Math.ceil(array.length / 2) - 1));
            }
            if (array.length % 2 === 0) {
                array[0].position.left = ((CENTER_CANVAS - (STEP * 0.5)) - STEP * (array.length / 2 - 1));
            }
        }
        array.forEach((element, index) => {
            if (index !== 0) {
                element.position.left = array[0].position.left + (STEP * index);
            }
        });
    }
    /**
     * 
     * @returns {number}
     */
    _calcucalteCenterCanvas() {
        const DEFAULT_CANVAS_CENTER = 640;
        const BASIC_PADDING = 40;
        const BETWEEN_PADDING = 110;
        const CANVAS_CENTER = BASIC_PADDING + BETWEEN_PADDING * (this.maxElementsInRow - 1);
        return CANVAS_CENTER > DEFAULT_CANVAS_CENTER ? CANVAS_CENTER : DEFAULT_CANVAS_CENTER;
    }
    /**
    * 
    * @returns {Object}
    */
    _getChildren() {
        const nodes = {
            0: [this.nodeId]
        };
        const relations = [];
        for (let i = 0; i < this.depth; i++) {
            const relation = new SimpleRecord('sys_cmdb_relationship');
            relation.addQuery('recipient_ci', 'IN', nodes[i]);
            relation.selectAttributes(['sys_id', 'recipient_ci', 'source_ci']);
            relation.query();
            if (!relation.getRowCount()) {
                break;
            }
            while (relation.next()) {
                if (!nodes[i + 1]) {
                    nodes[i + 1] = [];
                }
                const sourceCiValue = relation.getValue('source_ci');
                const recipientCiValue = relation.getValue('recipient_ci');
                if (!this.uniqueNodes[sourceCiValue]) {
                    nodes[i + 1].push(sourceCiValue);
                    this.uniqueNodes[sourceCiValue] = true;
                }
                const key = sourceCiValue + recipientCiValue;
                if (!this.uniqueRelations[key]) {
                    relations.push({
                        source: sourceCiValue,
                        target: recipientCiValue,
                        type: 'gray'
                    });
                    this.uniqueRelations[key] = true;
                }
            }
        }
        delete (nodes[0]);
        return {
            nodes,
            relations
        };
    }
    /**
    * 
    * @returns {Object}
    */
    _getParent() {
        const nodes = {
            0: [this.nodeId]
        };
        const relations = [];
        for (let i = 0; i < this.depth; i++) {
            const relation = new SimpleRecord('sys_cmdb_relationship');
            relation.addQuery('source_ci', 'IN', nodes[i]);
            relation.selectAttributes(['sys_id', 'recipient_ci', 'source_ci']);
            relation.query();
            if (!relation.getRowCount()) {
                break;
            }
            while (relation.next()) {
                if (!nodes[i + 1]) {
                    nodes[i + 1] = [];
                }
                const sourceCiValue = relation.getValue('source_ci');
                const recipientCiValue = relation.getValue('recipient_ci');
                if (!this.uniqueNodes[recipientCiValue]) {
                    nodes[i + 1].push(recipientCiValue);
                    this.uniqueNodes[recipientCiValue] = true;
                }
                const key = sourceCiValue + recipientCiValue;
                if (!this.uniqueRelations[key]) {
                    relations.push({
                        source: sourceCiValue,
                        target: recipientCiValue,
                        type: 'gray'
                    });
                    this.uniqueRelations[key] = true;
                }
            }
        }
        delete (nodes[0]);
        return {
            nodes,
            relations
        };
    }
    /**
    * 
    * @param {number}  nodeId
    * @returns {Object}
    */
    _transformNode(nodeId) {
        const configurationItem = this._getCiById(nodeId);
        // EDITS: Changed to 'cmdb_class_id'
        const nodeAttributes = this._getCiPositionByCiClassId(configurationItem.cmdb_class_id);
        // EDITS: Changed to 'cmdb_class_id'
        const my_class = this._getCiClassById(configurationItem.cmdb_class_id);
        // const type = this._getCiTypeById(configurationItem.ci_type);
        // EDITS: Changed to 'my_class.name' and set 'parts'
        const category = my_class.name || "Комплектующие";
        // ss.info("DependencyMapClassBased Include Script. my_class.name = " + category);
        this.uniqueCategories[category] = true;
        const image = new SimpleImage();
        const imageUrl = nodeAttributes.c_image ? image.getImageUrlById(nodeAttributes.c_image) : "blank";
        // ss.info("DependencyMapClassBased Include Script. image Url = " + imageUrl);
        // ss.info("DependencyMapClassBased Include Script. icon = " + nodeAttributes.icon);
        return {
            sysId: configurationItem.sys_id,
            id: configurationItem.sys_id,
            table: configurationItem.tableName,
            color: this._getNodeColor(configurationItem.operational_status),
            icon: nodeAttributes.icon || `<span class=icon-tab></span>`,
            image: imageUrl,
            // icon: `<span class=icon-tab style="background-image: url("${imageUrl}");"></span>`,
            title: configurationItem.name,
            href: (() => {
                const table = this._getTableById(configurationItem.sys_db_table_id);
                return `/record/${table.name}/${configurationItem.sys_id}`;
            })(),
            category: category,
            position: {
                top: nodeAttributes.order || 50,
                left: ''
            }
        };
    }
    /**
    * 
    * @param {number}  id CI sys_id
    * @returns {Object}
    */
    _getCiById(id) {
        return this.ciStorage[id];
    }
    // EDITS: Added _getCiPositionByCiClassId(typeId) method
    /**
    * 
    * @param {number}  id Type sys_id
    * @returns {Object} 
    */
    _getCiPositionByCiClassId(classId) {
        return this.ciPositionStorage[classId] || {
            icon: '<span class=icon-tab></span>',
            order: 50,
            c_ci_class: classId,
            c_image: "",
        };
    }
    /**
    * 
    * @param {number}  id Type sys_id
    * @returns {Object} 
    */
    _getCiPositionByCiTypeId(typeId) {
        return this.ciPositionStorage[typeId] || {
            icon: '<span class=icon-tab></span>',
            order: 50,
            ci_type: typeId,
            
        };
    }
    /**
    * 
    * @param {Number}  id Type CI sys_id
    * @returns {Object} Type CI sys_id
    */
    _getTableById(id) {
        return this.tableStorage[id];
    }
    // EDITS: Added _getCiClassById(id) method
    /**
    * 
    * @param {number}  id table sys_id
    * @returns {Object} tables sys_id
    */
    _getCiClassById(id) {
        const PARTS = "171749941817825343";
        return this.ciClassStorage[id] || PARTS;
    }
    /**
    * 
    * @param {number}  id table sys_id
    * @returns {Object} tables sys_id
    */
    _getCiTypeById(id) {
        const ITSERVICE = "157408198517259710";
        return this.ciTypeStorage[id] || ITSERVICE;
    }
    /**
    * 
    * @param {Array}  idsCi sys_id sys_cmdb_ci
    */
    _initStorage(idsCi) {
        // sys_cmdb_ci
        const configurationItem = new SimpleRecord('sys_cmdb_ci');
        // EDITS: Added 'cmdb_class_id'
        configurationItem.selectAttributes(['sys_id', 'operational_status', 'name', 'ci_type', 'sys_db_table_id', 'cmdb_class_id']);
        configurationItem.addQuery('sys_id', 'IN', idsCi);
        configurationItem.query();
        const ciTypes = [];
        // EDITS: Added ciClasses
        const ciClasses = [];
        const tableIds = [];
        while (configurationItem.next()) {
            this.ciStorage[configurationItem.sys_id] = {
                tableName: configurationItem.getTableName(),
                ...configurationItem.getAttributes()
            };
            ciTypes.push(configurationItem.getValue('ci_type'));
            // EDITS: Added push to ciClasses
            ciClasses.push(configurationItem.getValue('cmdb_class_id'));
            tableIds.push(configurationItem.sys_db_table_id);
        }
        // sys_cmdb_ci_position
        const nodeAttributes = new SimpleRecord('sys_cmdb_ci_position');
        // EDITS: Changed to 'c_ci_class'
        nodeAttributes.selectAttributes(['order', 'icon', 'c_ci_class', 'c_image']);
        nodeAttributes.addQuery('ci_type', 'IN', ciTypes);
        nodeAttributes.query();
        while (nodeAttributes.next()) {
            // EDITS: changed to 'c_ci_class'
            this.ciPositionStorage[nodeAttributes.getValue('c_ci_class')] = nodeAttributes.getAttributes();
        }
        // cmdb_class_type
        const types = new SimpleRecord('cmdb_class_type');
        types.addQuery('sys_id', 'IN', ciTypes);
        types.selectAttributes(['sys_id', 'name']);
        types.query();
        while (types.next()) {
            this.ciTypeStorage[types.sys_id] = types.getAttributes();
        }

        // EDITS
        // sys_cmdb_class
        const classes = new SimpleRecord('sys_cmdb_class');
        classes.addQuery('sys_id', 'IN', ciClasses);
        classes.selectAttributes(['sys_id', 'name']);
        classes.query();
        while (classes.next()) {
            this.ciClassStorage[classes.sys_id] = classes.getAttributes();
        }
        
        // sys_db_table
        const tables = new SimpleRecord('sys_db_table');
        tables.selectAttributes(['sys_id', 'name']);
        tables.addQuery('sys_id', 'IN', tableIds);
        tables.query();
        while (tables.next()) {
            this.tableStorage[tables.sys_id] = tables.getAttributes();
        }
    }
    /**
     * 
     * @param {string}  operationalStatus
     * @returns {String} color
     */
    _getNodeColor(operationalStatus) {
        const colors = {
            "0": "green",
            "1": "red",
            "2": "orange",
            "3": "red"
        };
        return colors[operationalStatus];
    }
}
