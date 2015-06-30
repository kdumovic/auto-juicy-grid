(function () {
  function powerIncrease(obj, property) {
    var power = 1;
    while (power <= obj[property])
      power *= 2;
    obj[property] = power;
  }

  function powerDecrease(obj, property, minimum) {
    var power = 1;
    while (power * 2 < obj[property])
      power *= 2;
    if (power < minimum) {
      power = minimum;
    }
    obj[property] = power;
  }
  
  Polymer('juicy-tile-editor-form', {
    modified: false,
    isSelection: false,
    isSingleSelection: false,
    selectedItems: [],
    tileLists: null,
    editedTiles: null,
    itemId: null,
    itemName: null,
    background: null,
    outline: null,
    width: null,
    widthAuto: null,
    height: null,
    heightAuto: null,
    heightDynamic: null,
    heightAdaptive: null,
    gutter: null,
    oversize: 0,
    priority: null,
    content: null,
    layout: null,
    newGroupFromSelection: function (width, isEmpty) {
      if (!this.selectedItems.length > 1) {
        return;
      }

      var current = this.selectedItems[0];
      var setup = {
        priority: current.priority,
        gutter: 0
      };

      var model = this.editedTiles;
      var newContainer = model.createNewContainer(null, current.container, setup, true);
      var dimensions = null;

      if (!isEmpty) {
          // performant heavy // may cause lots of repaints
          for (var i = 0, ilen = this.selectedItems.length; i < ilen; i++) {
              model.moveToContainer(this.selectedItems[i], newContainer, true);
          }

          dimensions = model.getMinimumDimensions(this.getContainerChildElements(newContainer));
      } else {
          dimensions = {
              width: "100%",
              height: "36px"
          };
      }

      this.selectedItems.length = 0; //change edited item to the new container
      this.selectedItems.push(newContainer);

      if (width) {
          newContainer.width = width;
      } else {
          newContainer.width = dimensions.width;
      }
      
      newContainer.height = dimensions.height;

      this.refresh();
      this.fire('juicy-tile-editor-form-tree-changed');
    },
    newInlineGroupFromSelection: function () {
        this.newGroupFromSelection();
    },
    newBlockGroupFromSelection: function () {
        this.newGroupFromSelection("100%");
    },
    newBlockEmptyGroup: function () {
        this.newGroupFromSelection("100%", true);
    },
    moveSelectionToEditedItemContainer: function () {
      if (!this.selectedItems.length > 1) {
        return;
      }

      var current = this.selectedItems[0];
      var container = current.items ? current : current.container;
      var model = this.editedTiles;
      for (var i = 1, ilen = this.selectedItems.length; i < ilen; i++) {
        model.moveToContainer(this.selectedItems[i], container, true);
      }

      var dimensions = model.getMinimumDimensions(this.getContainerChildElements(container));
      container.width = dimensions.width;
      container.height = dimensions.height;

      this.refresh();
      this.fire('juicy-tile-editor-form-tree-changed');
    },
    getContainerChildElements: function (container) {
      //FIXME I may not work (tomalec)
      var model = this.editedTiles;
      var elements = [];
      for (var i = 0, ilen = container.items.length; i < ilen; i++) {
        if (container.items[i].id) {
          elements.push(model.tiles[container.items[i].id]);
        }
      }
      return elements;
    },
    refreshModified: function () {
        for (var i = 0; i < this.tileLists.length; i++) {
            if (this.tileLists[i].sync && this.tileLists[i].sync.isModified()) {
                this.modified = true;
                return;
            }
        }

        this.modified = false;
    },
    gutterIncrease: function () {
      this.gutter++;
    },
    gutterDecrease: function () {
      if (this.gutter >= 1) {
        this.gutter--;
      }
    },
    oversizeIncrease: function () {
      if (this.oversize >= 1) {
        this.oversize++;
      }
      else{
        this.oversize = 1;
      }
    },
    oversizeDecrease: function () {
      if (this.oversize >= 1) {
        this.oversize--;
      }
    },
    refresh: function () {
      if (this.editedTiles) {
        this.editedTiles.refresh();
        this.refreshModified();
        this.getSource();
      }
    },
    widthIncrease: function () {
      powerIncrease(this, "width");
    },
    widthDecrease: function () {
      powerDecrease(this, "width");
    },
    heightIncrease: function () {
      if (this.height == 'auto') { //turn off auto
        this.height = 32;
        this.heightAuto = false;
      }
      powerIncrease(this, "height");
    },
    heightDecrease: function () {
      if (this.height == 'auto') { //turn off auto
        this.height = 32;
        this.heightAuto = false;
      }
      powerDecrease(this, "height");
    },
    priorityIncrease: function () {
      if (!this.selectedItems.length == 1) {
        return;
      }

      this.editedTiles
        .reprioritizeItem(this.selectedItems[0], true);
      this.priority = this.selectedItems[0].priority;
    },
    priorityDecrease: function () {
      if (!this.selectedItems.length == 1) {
        return;
      }

      this.editedTiles
        .reprioritizeItem(this.selectedItems[0], false);
      this.priority = this.selectedItems[0].priority;
    },
    deleteContainer: function () {
      var deleteElement = this.selectedItems[0];
      this.selectedItems[0] = deleteElement.container;
      this.editedTiles.deleteContainer(deleteElement, true);
      this.refresh();
      this.fire('juicy-tile-editor-form-tree-changed');
    },
    changeDirection: function(event, i, element){
      this.selectedItems[0].direction = element.value;
      this.direction = element.value;
      this.refresh();
    },
    /*stackItems: function () {
      for (var i = 0, ilen = this.selectedItems.length; i < ilen; i++) {
        if (this.selectedItems[i].items) {
          this.selectedItems[i].direction = "rightDown";
          this.selectedItems[i].heightAuto = true;
          for (var j = 0, jlen = this.selectedItems[i].items.length; j < jlen; j++) {
            this.selectedItems[i].items[j].width = "100%";
          }
        }
      }
      this.refresh();
    },*/
    isContainerInSelection: function() {
      for (var i = 0, ilen = this.selectedItems.length; i < ilen; i++) {
        if (this.selectedItems[i].items) {
          return true;
        }
      }
      return false;
    },
    isRootInSelection: function() {
      for (var i = 0, ilen = this.selectedItems.length; i < ilen; i++) {
        if (!this.selectedItems[i].container) {
          return true;
        }
      }
      return false;
    },
    isGroupableInSelection: function () {
        for (var i = 0, ilen = this.selectedItems.length; i < ilen; i++) {
            if (!this.selectedItems[i].container || !this.selectedItems[i].container.items) {
                return false;
            }
        }
        return true;
    },
    getCommonValue: function (propName) {
      if (this.selectedItems.length) {
        var val = this.selectedItems[0][propName];
        for (var i = 1, ilen = this.selectedItems.length; i < ilen; i++) {
          if (this.selectedItems[i][propName] !== val) {
            return ""; //shows "multiple" in placeholder
          }
        }
        return val;
      }
    },
    setCommonValue: function (propName, val) {
      if (this.selectedItems.length) {
        for (var i = 0, ilen = this.selectedItems.length; i < ilen; i++) {
          this.selectedItems[i][propName] = val;
        }
        this.refresh();
      }
    },
    setValueFromButton: function (ev) {
      var node = ev.target;
      while (node) {
        if (node.dataset && node.dataset.applyvalue) {
          this[node.dataset.applyvalue] = ev.target.value;
          break;
        }
        node = node.parentNode;
      }
    },
    toNumber: { 
      toModel: function(arg){
        return parseInt(arg, 10) || 0;
      },
      toDOM: function(arg){
        return arg;
      }
    },
    applyChange: function (ev) {
      var node = ev.target;
      while (node) {
        if (node.dataset && node.dataset.applyvalue) {
          this.setCommonValue(node.dataset.applyvalue, this[node.dataset.applyvalue]);
          break;
        }
        node = node.parentNode;
      }
    },
    saveChanges: function () {
        for (var i = 0; i < this.tileLists.length; i++) {
            var list = this.tileLists[i];

            list.sync.save();
        }

        this.modified = false;
        this.fire('juicy-tile-editor-save');
    },
    /**
     * Reverts setup and refresh tiles
     */
    revertChanges: function () {
        for (var i = 0; i < this.tileLists.length; i++) {
            var list = this.tileLists[i];

            list.sync.revert();
        }

        this.modified = false;
        this.fire('juicy-tile-editor-revert');
        this.getSource();
    },
    clearConfig: function () {
      this.editedTiles.sync.clear();
      this.refreshModified();
      this.getSource();
      this.fire('juicy-tile-editor-clear');
    },
    applyLayout: function () {
      this.editedTiles.setAttribute('layout', this.layout);
      this.editedTiles.refresh();
    },
    getSource: function () {
      this.source = this.editedTiles ? JSON.stringify(this.editedTiles.setup) : '';
    },
    /**
     * Force tiles to apply given JSON string as setup
     */
    applySource: function () {
      if (this.editedTiles) {
        this.editedTiles.setup = JSON.parse(this.source);
        this.refreshModified();
        this.fire('juicy-tile-editor-revert');
      }
    },
    resetStyles: function () {
        var groups = [];

        for (var i = 0; i < this.selectedItems.length; i++) {
            this.resetItemStyles(this.selectedItems[i], true, groups);
        }

        for (var i = 0; i < groups.length; i++) {
            this.editedTiles.deleteContainer(groups[i], true);
        }

        this.selectedItemsChanged();
        this.refresh();
        this.fire('juicy-tile-editor-form-tree-changed');
    },
    resetItemStyles: function (item, isSelected, groups) {
        if (item.items) {
            for (var i = 0; i < item.items.length; i++) {
                this.resetItemStyles(item.items[i], false, groups);
            }

            if (!isSelected) {
                groups.push(item);
            }
        }

        for (var i in this.editedTiles.defaultTileSetup) {
            item[i] = this.editedTiles.defaultTileSetup[i];
        }

        var skip = ["id", "items", "container", "direction"];

        for (var i in item) {
            if (skip.indexOf(i) >= 0) {
                continue;
            }

            if (i == "gutter") {
                item[i] = 0;
                continue;
            }

            if (typeof this.editedTiles.defaultTileSetup[i] == "undefined") {
                delete item[i];
            }
        }
    },
    selectedItemsChanged: function () {
      this.itemId = this.getCommonValue("id");
      this.itemName = this.getCommonValue("itemName");
      this.background = this.getCommonValue("background");
      this.outline = this.getCommonValue("outline");
      this.width = this.getCommonValue("width");
      this.widthAuto = this.getCommonValue("widthAuto") || false;
      this.height = this.getCommonValue("height");
      this.heightAuto = this.getCommonValue("heightAuto") || false;
      this.heightDynamic = this.getCommonValue("heightDynamic") || false;
      this.heightAdaptive = this.getCommonValue("heightAdaptive") || false;
      this.gutter = this.getCommonValue("gutter");
      this.oversize = this.getCommonValue("oversize");
      this.priority = this.getCommonValue("priority");
      this.direction = this.getCommonValue("direction");
      this.content = this.getCommonValue("content") || ""; //set content to empty string if undefined is returned
      this.layout = this.editedTiles ? this.editedTiles.getAttribute('layout') : '';
      this.isSelection = (this.selectedItems.length > 0);
      this.isSingleSelection = (this.selectedItems.length == 1);
      this.isContainer = this.isContainerInSelection();
      this.isRoot = this.isRootInSelection();
      this.isGroupable = this.isGroupableInSelection();
      this.isGroup = (this.isContainer && !this.isRoot);
      this.isRemovable = (this.isContainer && !this.isRoot) && this.isGroupable;
      //this.getSource();
      this.refresh();

      Array.prototype.forEach.call(this.shadowRoot.querySelectorAll('input[placeholder]'), function (input) {
        if (this.isSelection && !this.isSingleSelection) {
          input.setAttribute('placeholder', 'multiple'); //display "multiple" text when getCommonValue returns empty string
        }
        else {
          input.setAttribute('placeholder', '');
        }
      }.bind(this));
    },
    popoverExpand: function () {
        this.style.zIndex = 1;
    },
    popoverCollapse: function () {
        this.style.zIndex = "";
    }
  });
})();