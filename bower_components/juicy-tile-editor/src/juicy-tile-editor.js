(function () {
  /**
   * Produced inducted, reduced, spanning trees for given set of nodes.
   * @param  {Array-Like<Element>} elements array of DOM elements
   * @return {Array<Object>}       tree structure that wraps DOM nodes, array of root nodes
   * treeNode: {
        node: element,
        children: [{treeNode},{treeNode}],
        parentNode: null
      }
   * @IDEA rewrite map, foreach, filter to regular loops for performance (tomalec)
   * @IDEA separate as lib, write test (tomalec)
   */
  function reducedInductedSpanningTree( elements ){
    var elementsArray = Array.prototype.slice.call(elements,0);
    var treeNodes = elementsArray.map( function(element){
      return {
        node: element,
        //children: [],
        branches: [],
        parentNode: null
      };
    });
    elementsArray.forEach( function(element, index){
      var parent = element.parentNode,
          parentIndex = -1,
          //
          child = element,
          childId, parentTreeNode;

      while(parent){
        parentIndex = elementsArray.indexOf(parent);
        if( parentIndex > -1){
          //treeNodes[parentIndex].branches.push(treeNodes[index]);
          childId = child.getAttribute("juicytile");
          // childId = Array.prototype.indexOf.call(parent.tiles, child);
          parentTreeNode = treeNodes[parentIndex];
          //push to array, or create it
          if( parentTreeNode.branches[ childId ] ){
            parentTreeNode.branches[ childId ].push( treeNodes[index]);
          } else {
            parentTreeNode.branches[ childId ] = [ treeNodes[index] ];
          }
          treeNodes[index].parentNode = treeNodes[parentIndex];
          return; 
        }
        //
        child = parent;
        parent = parent.parentNode;
      }
    });

    return treeNodes.filter(function(elem){return elem.parentNode === null;});
  }

  function getTileOfContaining( parent, node ){
    var elem = node;
    while( elem && elem.parentNode != parent ){
      elem = elem.parentNode;
    }
    if(elem && elem.hasAttribute("juicytile")){
      elem = parent.tiles[elem.getAttribute('juicytile')];
    }
    return elem;
  }

  function keyOf( arrayObj, element ){
    for( var key in arrayObj ){
      if( arrayObj[key] === element ){
        return key;
      }
    }
  }

  function getRootNode( element ){
    if( document.contains(element) ){
      return document;
    }
    
    var root = element;
    while( root.parentNode ){
      root = root.parentNode;
    }
    return root;
  }

    
  function saveSidebarState(bar) {
      window.localStorage.setItem("juicy-tile-editor-sidebar-class-name", bar.className);
      window.localStorage.setItem("juicy-tile-editor-sidebar-width", bar.style.width);
  }

  function restoreSidebarState(bar) {
      var className = window.localStorage.getItem("juicy-tile-editor-sidebar-class-name");
      var width = window.localStorage.getItem("juicy-tile-editor-sidebar-width");

      if (className) {
          bar.className = className;
      }

      if (width) {
          bar.style.width = width;
      }
  }

  function applySidebarPosition(bar, css) {
      if (css) {
          bar.classList.add(css);
          saveSidebarState(bar);
      }

      bar.style.left = "";
      bar.style.right = "";
      bar.style.top = "";
      bar.style.bottom = "";
  }

  function getItemDisplayName(item, branch) {
      var txt = "";
      var elem = branch.node.querySelector('[juicytile="' + item.id + '"]');

      if (!elem) {
          return item.id;
      }
      var header = elem.querySelector("h1, h2, h3, h4, h5, h6");

      if (header) {
          txt = header.textContent;
      } else {
          txt = elem.textContent;
      }

      txt = txt.trim().replace(/\s+/gi, " ");

      if (!txt) {
          txt = "<" + elem.nodeName.toLowerCase() + ">";
      }

      if (txt.length > 23) {
          txt = txt.substr(0, 20) + " \u2026"; //'HORIZONTAL ELLIPSIS' (U+2026)
      }

      return txt;
  }

  function getRootItemDisplayName(node, short) {
      var name = node.id || node.getAttribute("name") || node.localName || node.tagName.toLowerCase();

      if (short && /[/]/gi.test(name)) {
          name = name.split("/");
          name = name[name.length - 1];
      }

      return name;
  }

  function setItemName(item, branch) {
      if (!item.itemName) {
          item.itemName = getItemDisplayName(item, branch);
      }

      var items = item.items;

      if (items) {
          for (var i = 0; i < items.length; i++) {
              setItemName(items[i], branch);
          }
      }

      if (branch && branch.branches[item.id]) {
          var branches = branch.branches[item.id];

          for (var i = 0; i < branches.length; i++) {
              setBranchName(branches[i]);
          }
      }
  }

  function setBranchName(branch) {
      if (!branch.node.setup.itemName) {
          branch.node.setup.itemName = getRootItemDisplayName(branch.node, true);
      }

      var items = branch.node.setup.items;

      if (items) {
          for (var i = 0; i < items.length; i++) {
              setItemName(items[i], branch);
          }
      }
  }

  Polymer('juicy-tile-editor', {
    selectionMode: false,
    editedElement: null,
    highlightedTile: null,
    selectedItems: [],
    selectedElements: [],
    sortableTilesModel: null,
    mouseOverListener: null,
    mouseOutListener: null,
    mouseupListener: null,
    contextMenuListener: null,
    keyUpListener: null,
    tree: [],
    /** Document | DocumentFragment document root, or shadow root containing this element. */
    parentRoot: null,
    /** {NodeList | Array} of <juicy-tile-list> elements we will bind to */
    tileLists: null,
    /** 
     * Search document (and shadowRoot if any) for juicy-tile-lists to manage 
     * @returns {NodeList | Array} found lists.
    */
    attachTileLists: function (){
      // var lists = document.getElementsByTagName('juicy-tile-list').array();
      var lists = Array.prototype.slice.call (
          document.querySelectorAll('juicy-tile-list, juicy-tile-grid')
      );
      if( this.parentRoot != document ){
        lists.concat(
          this.parentRoot.querySelectorAll('juicy-tile-list, juicy-tile-grid')
          );
      }
      this.tileLists = lists;
      return lists;
    },
    domReady: function () {// doReady instead of attached to make sure `attrChanged` will not be triggered afterwards
      var that = this;

      // get root element to provide scope where we will be searching for juicy-tile-lists
      if( document.contains(this) ){
        this.parentRoot = document;
      } else {
        var root = this;
        while( root.parentNode ){
          root = root.parentNode;
        }
        this.parentRoot = root;
      }

      // getElementsByTagName is cool because it's fast and its LIVE
      // as it is live, consider moving to created callback.
      // this.tileLists = this.parentRoot.getElementsByTagName('juicy-tile-list');
      this.attachTileLists();

      //this.$.tileEdited.show(this.selectedElements.length ? this.selectedElements[0] : null);

      // trigger change manually to start listening,
      // if needed according to initial state of selectionMode
      this.selectionModeChanged();
      
      this.$.sidebarDrag.addEventListener("juicy-draggable-stop", function (args) {
          if (args.detail.dragElement != that.$.sidebar) {
              return;
          }

          var edge = 80;
          var event = args.detail;
          var bar = that.$.sidebar;
          var size = that.$.sidebarDrag.getScreenSize();
          var x = size.x, y = size.y;

          bar.className = "sidebar";

          var ex = event.mouseEvent.clientX;
          var ey = event.mouseEvent.clientY;

          if (ey < edge && ex < edge) {
              applySidebarPosition(bar, "left-top");
          } else if (ey < edge && ex > (x - edge)) {
              applySidebarPosition(bar, "right-top");
          } else if (ey > (y - edge) && ex < edge) {
              applySidebarPosition(bar, "left-bottom");
          } else if (ey > (y - edge) && ex > (x - edge)) {
              applySidebarPosition(bar, "right-bottom");
          } else if (ey < edge) {
              applySidebarPosition(bar, "top");
          } else if (ey > (y - edge)) {
              applySidebarPosition(bar, "bottom");
          } else if (ex > (x - edge)) {
              applySidebarPosition(bar, "right");
          } else if (ex < edge) {
              applySidebarPosition(bar, "left");
          }

          bar.style.zIndex = "";
      });

      this.$.sidebarResize.addEventListener("juicy-resizable-stop", function () {
          saveSidebarState(that.$.sidebar);
      });

      restoreSidebarState(this.$.sidebar);

      setTimeout(function () {
          that.treeRefresh();
      });

      /*window.addEventListener("beforeunload", function (e) {
          if (that.$.form.modified) {
              var message = "You have unsaved layout setup changes!";

              (e || window.event).returnValue = message;
              return message;
          }
      });*/
    },
    detached: function () {
      this.$.tileEdited.hide();
      this.highlightedTile = null;
      this.$.tileRollover.hide();
      this.$.tileSelected.hide();
      this.selectionMode = false;
      this.unlisten(); //changing property in "detached" callback does not execute "selectionModeChanged" (Polymer 0.2.3)
    },
    //attributeChanged
    selectionModeChanged: function() {
      if( !this.tileLists ){ 
      // do nothing before domReady: no tiles to observe
        return;
      }
      if (this.selectionMode) {
        this.listen();
      }
      else {
        this.unlisten();
      }
    },
    listen: function () {
      var editor = this;
      // Highlight hovered tile
      this.mouseOverListener = function (ev) {
        // editor.highlightedTile = null;
        var highlightedTile = getTileOfContaining(this, ev.target);
        if (highlightedTile) {
          if (editor.highlightedTile !== highlightedTile) {
            editor.highlightedTile = highlightedTile;
            editor.$.tileRollover.show( highlightedTile);
          }
          ev.stopImmediatePropagation();
        }
      };
      // Remove highlight
      this.mouseOutListener = function (ev) {
        editor.highlightedTile = null;
        this.$.tileRollover.hide();
      }.bind(this);

      // Attach clicked tile for editing
      // Expand selection if cmd/ctrl/shift button pressed
      this.clickListener = function (ev) {
          // var tile = getTileOfContaining(this,  ev.target);
          // console.log(tile);
          // return true;


        if (editor.highlightedTile) {
          //TODO (tomalec): replace with native this.contains()
          var inHere = keyOf( this.tiles, editor.highlightedTile);
          if( !inHere ){// Element is inside nested <juicy-tile-list>
            return false; 
          }
          ev.preventDefault();
          ev.stopImmediatePropagation();

          editor.treeRefresh();
          // TODO(tomalec) unify  .allItems and .tiles
          var highlightedItem = this.allItems[ editor.highlightedTile.id ];
          if (ev.ctrlKey || ev.metaKey || ev.shiftKey) {
            if(editor.editedTiles == this) {
              //expand group
              var index = editor.selectedItems.indexOf(highlightedItem);
              if(index == -1) {
                editor.treeHighlightExtendAction(highlightedItem);
                editor.$.treeView.highlightBranch(highlightedItem, true);
              }
              else {
                editor.treeHighlightRemoveAction(highlightedItem);
                editor.$.treeView.unhighlightBranch(highlightedItem);
              }
            }
          }
          else {
            editor.treeHighlightAction(highlightedItem, this);
            editor.$.treeView.openBranch(highlightedItem);
            editor.$.treeView.highlightBranch(highlightedItem);
          }
        }
      };

      // Mac command key fix
      this.contextMenuListener = function (ev) {
        if (ev.ctrlKey) {
          ev.preventDefault(); //on Mac, CTRL+Click opens system context menu, which we would like to avoid
        }
      }.bind(this);
      // Shortcuts
      this.keyUpListener = function (ev) {
        if (ev.ctrlKey || ev.metaKey) { //mind that CTRL+T, CTRL+N, CTRL+W cannot be captured in Chrome
          if (ev.keyCode == 71) { //CTRL+G
            this.newGroupFromSelection();
            ev.preventDefault();
          }
          else if (ev.keyCode == 77) { //CTRL+M
            this.moveSelectionToEditedItemContainer();
            ev.preventDefault();
          }
          else if (ev.keyCode == 85) { //CTRL+U
            //TODO ungroup selection
          }
        }
      }.bind(this);


      // attach listeners for every <juicy-tile-list>
      var listNo = this.tileLists.length;
      var list, shadowContainer;
      while( listNo-- ){
        list = this.tileLists[ listNo ];
        shadowContainer = list.$.container; // list.shadowRoot.getElementById("container");

        // TODO (tomalec) unify virtual groups and real items selection.
        list.addEventListener('mouseover', this.mouseOverListener);
        shadowContainer.addEventListener('mouseover', this.mouseOverListener);
        list.addEventListener('mouseout', this.mouseOutListener);
        shadowContainer.addEventListener('mouseout', this.mouseOutListener);

        list.addEventListener('click', this.clickListener, true);
        // shadowContainer.addEventListener('click', this.clickListener, true);
      }

      window.addEventListener('contextmenu', this.contextMenuListener);
      window.addEventListener('keyup', this.keyUpListener);
    },
    unlisten: function () {  
      // remove listeners for every <juicy-tile-list>
      var listNo = this.tileLists.length;
      var list, shadowContainer;
      while( listNo-- ){
        list = this.tileLists[ listNo ];
        shadowContainer = list.$.container; // list.shadowRoot.getElementById("container");

        list.removeEventListener('mouseover', this.mouseOverListener);
        shadowContainer.removeEventListener('mouseover', this.mouseOverListener);
        list.removeEventListener('mouseout', this.mouseOutListener);
        shadowContainer.removeEventListener('mouseout', this.mouseOutListener);

        list.removeEventListener('click', this.clickListener, true);
      }
      window.removeEventListener('contextmenu', this.contextMenuListener);
      window.removeEventListener('keyup', this.keyUpListener);
    },
    toggleSelectionMode: function () {
      this.selectionMode = !this.selectionMode;
    },
    revertAction: function() {
      this.selectedItems.length = 0; //TODO solve this better (put changes on a stack?). Currently I need to clear selection because `this.editedTiles.setupChanged()` recreates `setup`, which results in `this.selectedItems` pointing to objects that are not referenced anymore [Marcin]
      this.$.tileEdited.show();
      this.highlightedTile = null;
      this.$.tileRollover.hide();
      this.$.tileSelected.hide();
      this.treeChangedAction();
    },
    clearAction: function () {
        this.treeChangedAction();
    },
    treeHighlightAction: function (item, tileList) {
      if(item.detail) {  //is tree event
        tileList = item.detail.tiles;
        item = item.detail.branch;
      }
      this.editedTiles = tileList;
      var tile = tileList.tiles[item.id];
      this.$.tileEdited.show(tile);
      this.selectedItems.length = 0;
      this.selectedItems.push(item);
      this.selectedElements.length = 0;
      this.selectedElements.push(tile);
    },
    treeHoverAction: function (item, tileList) {
        if (item.detail) {  //is tree event
            tileList = item.detail.tiles;
            item = item.detail.branch;
        }

        var tile = tileList.tiles[item.id];
        this.$.tileRollover.show(tile);
    },
    treeBlurAction: function (item, tileList) {
        this.$.tileRollover.hide();
    },
    /**
     * [treeRefresh description]
     * @return {[type]} [description]
     */
    // tree: [
    //  {
    //    node: _juicy-tile-list_,
    //    branches: [
    //      _setup.items[?].index_: [
    //        _tree_,
    //        _tree_
    //      ]
    //    ]
    //  }
    // ]
    treeRefresh: function() {
      // notify observer/two-way-binding/tempalte only once
      // Idea calculate this only once
        if (!this.tree.length) {
            this.tree = reducedInductedSpanningTree(this.tileLists);
        }

        for (var i = 0; i < this.tree.length; i++) {
            var branch = this.tree[i];

            setBranchName(branch);
        }
    },
    treeHighlightExtendAction: function(item) {
      if(item.detail) {  //is tree event
        item = item.detail.branch;
      }
      this.selectedItems.push(item);
      this.selectedElements.push( this.editedTiles.tiles[item.id] );
      this.$.tileSelected.show(this.selectedElements);
    },
    treeHighlightRemoveAction: function(item) {
      if(item.detail) {  //is tree event
        item = item.detail.branch;
      }
      var index = this.selectedItems.indexOf(item);
      this.selectedItems.splice(index, 1);
      this.selectedElements.splice(index, 1);
      this.$.tileSelected.show(this.selectedElements);
    },
    treeChangedAction: function () {
        setTimeout((function () {
            this.treeRefresh();
            this.$.treeView.highlightBranch(this.selectedItems[0]);
        }).bind(this));
    },
    refreshTileList: function(e){
      var listEditedByForm = this.$.form.editedTiles;
      // // refresh specific tile list if given
      // if(e.detail && e.detail.refresh){
      //   e.detail.refresh();
      //   // refresh from if needed
      //   if(e.detail === listEditedByForm){
      //     this.$.form.refresh();
      //   }
      // } else {
        var listNo = this.tileLists.length;
        while(listNo--){
          this.tileLists[listNo].refresh();
          // refresh form if needed
          if(listEditedByForm && this.tileLists[listNo] === listEditedByForm){
            this.$.form.refresh();
          }
        }
      // }
      e.stopImmediatePropagation();
    },
    refreshForm: function (e) {
        this.$.form.refresh();
    },
    moveToNextPosition: function (e) {
        var classes = ["left-top", "top", "right-top", "right", "right-bottom", "bottom", "left-bottom", "left"];
        var bar = this.$.sidebar;

        for (var i = 0; i < classes.length; i++) {
            if (bar.classList.contains(classes[i])) {
                var ni = ((i + 1) >= classes.length) ? 0 : (i + 1);

                bar.classList.remove(classes[i]);
                bar.classList.add(classes[ni]);
                saveSidebarPosition(classes[ni]);
                break;
            }
        }
    },
    treeItemDragStop: function (e) {
        var item = e.detail.item;
        var branch = e.detail.branch;
        var form = this.$.form;

        form.selectedItems.length = 0;
        form.selectedItems.push(branch, item);
        form.moveSelectionToEditedItemContainer();
    },
    unhideAll: function () {
        for (var i = 0; i < this.tileLists.length; i++) {
            this.unhideListItems(this.tileLists[i]);
        }
    },
    unhideListItems: function (list) {
        for (var i in list.allItems) {
            var item = list.allItems[i]
            this.unhideItems(item.items);
        }

        var lists = list.querySelectorAll("juicy-tile-list, juicy-tile-grid");

        for (var i = 0; i < lists.length; i++) {
            this.unhideListItems(lists[i]);
        }

        list.refresh();
    },
    unhideItems: function (items) {
        if (!items) {
            return;
        }

        for (var i = 0; i < items.length; i++) {
            items[i].hidden = false;
            this.unhideItems(items[i].items);
        }
    }
  });
})();