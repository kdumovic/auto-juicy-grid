(function () {
    Polymer('juicy-tile-tree', {
    collapsed: {},
    tree: [],
    editItem: null,
    editBranch: null,
    highlightedBranches: [],
    /**
     * Converts branch object to a display name string. Can be overloaded
     * @param {Object} branch {node: {branchnode} [, item: branchnode.node.setup.items[n]]}
     * @returns {String}
     */
    toRootName: function (node, short) {
        var name = node.id || node.getAttribute("name");

        if (short && /[/]/gi.test(name)) {
            name = name.split("/");
            name = name[name.length - 1];
        }

        return name;
    },
    tapAction: function (ev, index, target) {
      var eventName;
      var model = target.templateInstance.model;
      var isNestedTiles = this.isNestedTilesLabel(target);
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey) {
        if (this.isBranchHighlighted(model.item)) {
          eventName = 'juicy-tile-tree-highlight-remove';
          this.unhighlightBranch(model.item);
        }
        else {
          eventName = 'juicy-tile-tree-highlight-extend';
          this.highlightBranch(model.item, true);
        }
      }
      else {
        eventName = 'juicy-tile-tree-highlight';
        if (isNestedTiles) {
          this.highlightBranch(model.branch.node.setup);
        }
        else {
          this.highlightBranch(model.item);
        }
      }
      if (isNestedTiles) {
        this.fire(eventName, {branch: model.branch.node.setup, tiles: model.branch.node});
      }
      else {
        this.fire(eventName, {branch: model.item, tiles: model.branch.node});
      }
    },
    nameDblclickAction: function (property, ev, index, target) {
        if (target.classList.contains("active")) {
            return;
        }
    
        var model = target.templateInstance.model;

        if (property == "item") {
            this.editItem = model.item;
            this.editBranch = null;
        } else {
            this.editItem = null;
            this.editBranch = model.branch;
        }

        target.focus();
        target.selectionStart = 0;
        target.selectionEnd = target.value.length;
    },
    itemNameDblclickAction: function (ev, index, target) {
        this.nameDblclickAction("item", ev, index, target);
    },
    branchNameDblclickAction: function (ev, index, target) {
        this.nameDblclickAction("branch", ev, index, target);
    },
    nameBlurAction: function (ev, index, target) {
        this.editItem = null;
        this.editBranch = null;
        this.fire("juicy-tile-tree-item-name-changed");
    },
    nameKeypressAction: function (ev, index, target) {
        if (ev.which == 13) {
            target.blur();
        }
    },
    hoverBlurAction: function (eventName, ev, index, target) {
        var model = target.templateInstance.model;
        var isNestedTiles = this.isNestedTilesLabel(target);

        if (isNestedTiles) {
            this.fire(eventName, { branch: model.branch.node.setup, tiles: model.branch.node });
        } else {
            this.fire(eventName, { branch: model.item, tiles: model.branch.node });
        }
    },
    hoverAction: function (ev, index, target) {
        this.hoverBlurAction("juicy-tile-tree-hover", ev, index, target);
    },
    blurAction: function (ev, index, target) {
        this.hoverBlurAction("juicy-tile-tree-blur", ev, index, target);
    },
    isNestedTilesLabel: function(elem) {
      var model = elem.templateInstance.model;
      var proto = Object.getPrototypeOf(model);

      if (model.item === proto.item) { //a nested tiles (item is inherited from prototype)
        return true;
      }
      return false; //a branch of a leaf (branch is inherited from prototype)
    },
    highlightElement: function (elem) {
        var top = 0;

        elem.classList.add("highlight");

        while (elem != null && elem != this.$.root) {
            if (elem.tagName == "LI") {
                top += (elem.offsetTop || 0);
            }

            elem = elem.parentNode;
        }

        if (top > (this.scrollTop + this.clientHeight) || top < this.scrollTop) {
            this.scrollTop = top;
        }
    },
    highlightBranch: function (branch, expand) {
      var that = this;
      if (!expand) {
        this.highlightedBranches.length = 0;
      }
      this.highlightedBranches.push(branch);

      setTimeout(function () {
          //I need to refresh element classes imperatively because Polymer only observes on filter parameter changes [warpech]
          Array.prototype.forEach.call(that.$.root.querySelectorAll('.element-label'), function (elem) {
              var isNestedTiles = this.isNestedTilesLabel(elem);
              if (isNestedTiles && elem.templateInstance.model.branch.node.setup == branch) {
                  that.highlightElement(elem);
              }
              else if (!isNestedTiles && elem.templateInstance.model.item == branch) {
                  that.highlightElement(elem);
              }
              else if (!expand) {
                  elem.classList.remove("highlight");
              }
          }.bind(that));
      });
    },
    openBranch: function (branch) {
        var that = this;
        var element = null;

        Array.prototype.forEach.call(that.$.root.querySelectorAll('.element-label'), function (elem) {
            var isNestedTiles = this.isNestedTilesLabel(elem);

            if (isNestedTiles && elem.templateInstance.model.branch.node.setup == branch) {
                element = elem;
            } else if (!isNestedTiles && elem.templateInstance.model.item == branch) {
                element = elem;
            }
        }.bind(that));

        while (element) {
            if (element.tagName == "LI") {
                var btn = element.querySelector(".expand");

                if (btn) {
                    btn.removeAttribute("checked");
                }
            }

            element = element.parentNode;
        }
    },
    unhighlightBranch: function (branch) {
      this.highlightedBranches.splice(this.highlightedBranches.indexOf(branch), 1);

      //I need to refresh element classes imperatively because Polymer only observes on filter parameter changes [warpech]
      Array.prototype.forEach.call(this.$.root.querySelectorAll('.element-label.highlight'), function (elem) {
        if (elem.templateInstance.model.item === branch) {
          elem.classList.remove("highlight");
        }
      });
    },
    isBranchHighlighted: function (branch) {
      return this.highlightedBranches.indexOf(branch) > -1;
    },
    getBranchClassName: function (branch) {
        var css = ["element-label"];

        if (this.isBranchHighlighted(branch)) {
            css.push("highlight");
        }

        return css.join(" ");
    },
    /*preventTextSelection: function(ev) {
      ev.preventDefault();
    },*/
    refreshTileList: function(ev){
      // this.fire('juicy-tile-tree-refresh-tile-list', ev.target.value);
      this.fire('juicy-tile-tree-refresh-tile-list');
    },
    itemDragStop: function (e, index, target) {
        if (!e.detail.dropElement) {
            return;
        }

        var item = e.target.templateInstance.model.item;
        var branch = e.detail.dropElement.templateInstance.model.item;

        if (item == branch) {
            return;
        }

        this.tapAction(e, index, target);
        this.fire("juicy-tile-tree-drag-item-stop", { item: item, branch: branch });
    }
  });
})();