"use strict";
function Collection() {
    this.id = "",
    this.name = "",
    this.requests = {}
}
function CollectionRequest() {
    this.collectionId = "",
    this.id = "",
    this.name = "",
    this.description = "",
    this.url = "",
    this.method = "",
    this.headers = "",
    this.data = "",
    this.dataMode = "params",
    this.timestamp = 0
}
function Request() {
    this.id = "",
    this.name = "",
    this.description = "",
    this.url = "",
    this.method = "",
    this.headers = "",
    this.data = "",
    this.dataMode = "params",
    this.timestamp = 0
}
function sortAlphabetical(e, t) {
    var n;
    e.name.length > t.name.legnth ? n = t.name.length : n = e.name.length;
    for (var r = 0; r < n; r++) {
        if (e.name[r] == t.name[r])
            continue;
        return e.name[r] > t.name[r] ? 1 : -1
    }
    return 1
}
var pm = {};
pm.indexedDB = {},
pm.indexedDB.db = null,
pm.indexedDB.modes = {
    readwrite: "readwrite",
    readonly: "readonly"
},
pm.fs = {},
pm.webUrl = "http://getpostman.com",
pm.bannedHeaders = ["accept-charset", "accept-encoding", "access-control-request-headers", "access-control-request-method", "connection", "content-length", "cookie", "cookie2", "content-transfer-encoding", "date", "expect", "host", "keep-alive", "origin", "referer", "te", "trailer", "transfer-encoding", "upgrade", "user-agent", "via"];
var curIndexDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB
  , IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction
  , IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange
  , IDBCursor = window.IDBCursor || window.webkitIDBCursor;
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem,
pm.init = function() {
    Handlebars.partials = Handlebars.templates,
    pm.history.init(),
    pm.collections.init(),
    pm.settings.init(),
    pm.layout.init(),
    pm.editor.init(),
    pm.request.init(),
    pm.urlCache.refreshAutoComplete(),
    pm.helpers.init(),
    pm.keymap.init(),
    pm.envManager.init(),
    pm.filesystem.init(),
    pm.indexedDB.open(),
    pm.broadcasts.init(),
    $(":input:first").focus()
}
,
$(document).ready(function() {
    pm.init()
}),
$(window).on("unload", function() {
    pm.request.saveCurrentRequestToLocalStorage()
}),
pm.broadcasts = {
    init: function() {
        var e = localStorage.broadcasts
          , t = localStorage.broadcast_last_update_time
          , n = new Date;
        pm.broadcasts.fetch();
        if (t) {
            var r = new Date(t);
            pm.broadcasts.setLastUpdateTime(n)
        } else
            pm.broadcasts.setLastUpdateTime(n);
        $("#broadcasts-count").on("click", function() {
            pm.broadcasts.markAllAsRead()
        })
    },
    fetch: function() {
        var e = "http://localhost/postman-server/html/broadcasts";
        console.log(e),
        $.get(e, function(e) {
            pm.broadcasts.setBroadcasts(e.broadcasts),
            pm.broadcasts.renderBroadcasts()
        })
    },
    setLastUpdateTime: function(e) {
        localStorage.broadcast_last_update_time = e.toUTCString()
    },
    setBroadcasts: function(e) {
        var t;
        "broadcasts"in localStorage ? t = JSON.parse(localStorage.broadcasts) : t = [];
        var n, r, i;
        if (t.length == 0) {
            r = e.length;
            for (n = 0; n < r; n++)
                e[n].status = "unread";
            i = e.length,
            localStorage.broadcasts = JSON.stringify(e)
        } else {
            r = e.length;
            var s = [];
            for (n = 0; n < r; n++) {
                var o = e[n]
                  , u = _.find(t, function(e) {
                    return e.id === o.id
                });
                u || (o.status = "unread",
                s.push(o))
            }
            i = s.length,
            t = _.union(s, t),
            localStorage.broadcasts = JSON.stringify(t)
        }
        var a = $("#broadcasts-count");
        a.html(i),
        a.removeClass(),
        i > 0 ? a.addClass("new-broadcasts") : a.addClass("no-new-broadcasts")
    },
    markAllAsRead: function() {
        var e = $("#broadcasts-count");
        e.removeClass(),
        e.addClass("no-new-broadcasts"),
        e.html("0");
        var t = JSON.parse(localStorage.broadcasts)
          , n = t.length;
        for (var r = 0; r < n; r++)
            t[r].status = "read";
        localStorage.broadcasts = JSON.stringify(t),
        pm.broadcasts.renderBroadcasts()
    },
    renderBroadcasts: function() {
        var e = JSON.parse(localStorage.broadcasts);
        $("#broadcasts .dropdown-menu").html(""),
        $("#broadcasts .dropdown-menu").append(Handlebars.templates.broadcasts({
            items: e
        }))
    }
},
pm.collections = {
    areLoaded: !1,
    items: [],
    init: function() {
        this.addCollectionListeners()
    },
    addCollectionListeners: function() {
        $("#collection-items").on("mouseenter", ".sidebar-collection .sidebar-collection-head", function() {
            var e = jQuery(".collection-head-actions", this);
            e.css("display", "block")
        }),
        $("#collection-items").on("mouseleave", ".sidebar-collection .sidebar-collection-head", function() {
            var e = jQuery(".collection-head-actions", this);
            e.css("display", "none")
        }),
        $("#collection-items").on("click", ".sidebar-collection-head-name", function() {
            var e = $(this).attr("data-id");
            pm.collections.toggleRequestList(e)
        }),
        $("#collection-items").on("click", ".collection-head-actions .label", function() {
            var e = $(this).parent().parent().parent().attr("data-id");
            pm.collections.toggleRequestList(e)
        }),
        $("#collection-items").on("click", ".request-actions-delete", function() {
            var e = $(this).attr("data-id");
            pm.collections.deleteCollectionRequest(e)
        }),
        $("#collection-items").on("click", ".request-actions-load", function() {
            var e = $(this).attr("data-id");
            pm.collections.getCollectionRequest(e)
        }),
        $("#collection-items").on("click", ".request-actions-edit", function() {
            var e = $(this).attr("data-id");
            $("#form-edit-collection-request .collection-request-id").val(e),
            pm.indexedDB.getCollectionRequest(e, function(e) {
                $("#form-edit-collection-request .collection-request-name").val(e.name),
                $("#form-edit-collection-request .collection-request-description").val(e.description),
                $("#modal-edit-collection-request").modal("show")
            })
        }),
        $("#collection-items").on("click", ".collection-actions-edit", function() {
            var e = $(this).attr("data-id")
              , t = $(this).attr("data-name");
            $("#form-edit-collection .collection-id").val(e),
            $("#form-edit-collection .collection-name").val(t),
            $("#modal-edit-collection").modal("show")
        }),
        $("#collection-items").on("click", ".collection-actions-delete", function() {
            var e = $(this).attr("data-id")
              , t = $(this).attr("data-name");
            $("#modal-delete-collection-yes").attr("data-id", e),
            $("#modal-delete-collection-name").html(t)
        }),
        $("#modal-delete-collection-yes").on("click", function() {
            var e = $(this).attr("data-id");
            pm.collections.deleteCollection(e)
        }),
        $("#import-collection-url-submit").on("click", function() {
            var e = $("#import-collection-url-input").val();
            pm.collections.importCollectionFromUrl(e)
        }),
        $("#collection-items").on("click", ".collection-actions-download", function() {
            var e = $(this).attr("data-id");
            $("#modal-share-collection").modal("show"),
            $("#share-collection-get-link").attr("data-collection-id", e),
            $("#share-collection-download").attr("data-collection-id", e),
            $("#share-collection-link").css("display", "none")
        }),
        $("#share-collection-get-link").on("click", function() {
            var e = $(this).attr("data-collection-id");
            pm.collections.uploadCollection(e, function(e) {
                $("#share-collection-link").css("display", "block"),
                $("#share-collection-link").html(e)
            })
        }),
        $("#share-collection-download").on("click", function() {
            var e = $(this).attr("data-collection-id");
            pm.collections.saveCollection(e)
        });
        var e = document.getElementById("import-collection-dropzone");
        e.addEventListener("dragover", function(e) {
            e.stopPropagation(),
            e.preventDefault(),
            e.dataTransfer.dropEffect = "copy"
        }, !1),
        e.addEventListener("drop", function(e) {
            e.stopPropagation(),
            e.preventDefault();
            var t = e.dataTransfer.files;
            pm.collections.importCollections(t)
        }, !1),
        $("#collection-files-input").on("change", function(e) {
            var t = e.target.files;
            pm.collections.importCollections(t),
            $("#collection-files-input").val("")
        })
    },
    saveCollection: function(e) {
        pm.indexedDB.getCollection(e, function(e) {
            var t = e;
            pm.indexedDB.getAllRequestsInCollection(t, function(e, t) {
                e.requests = t;
                var n = e.name + ".json"
                  , r = "application/json"
                  , i = JSON.stringify(e);
                pm.filesystem.saveAndOpenFile(n, i, r, function() {})
            })
        })
    },
    uploadCollection: function(e, t) {
        pm.indexedDB.getCollection(e, function(e) {
            pm.indexedDB.getAllRequestsInCollection(e, function(e, n) {
                e.requests = n;
                var r = e.name + ".json"
                  , i = "application/json"
                  , s = JSON.stringify(e)
                  , o = pm.webUrl + "/collections";
                $.ajax({
                    type: "POST",
                    url: o,
                    data: s,
                    success: function(e) {
                        var n = e.link;
                        t(n)
                    }
                })
            })
        })
    },
    importCollections: function(e) {
        for (var t = 0, n; n = e[t]; t++) {
            var r = new FileReader;
            r.onload = function(e) {
                return function(e) {
                    var t = e.currentTarget.result
                      , n = JSON.parse(t);
                    n.id = guid(),
                    pm.indexedDB.addCollection(n, function(e) {
                        var t = {
                            name: n.name,
                            action: "added"
                        };
                        $(".modal-import-alerts").append(Handlebars.templates.message_collection_added(t));
                        var r = [];
                        for (var i = 0; i < n.requests.length; i++) {
                            var s = n.requests[i];
                            s.collectionId = n.id,
                            s.id = guid(),
                            pm.indexedDB.addCollectionRequest(s, function(e) {}),
                            r.push(s)
                        }
                        n.requests = r,
                        pm.collections.render(n)
                    })
                }
            }(n),
            r.readAsText(n)
        }
    },
    importCollectionFromUrl: function(e) {
        $.get(e, function(e) {
            var t = e;
            t.id = guid(),
            pm.indexedDB.addCollection(t, function(e) {
                var n = {
                    name: t.name,
                    action: "added"
                };
                $(".modal-import-alerts").append(Handlebars.templates.message_collection_added(n));
                var r = [];
                for (var i = 0; i < t.requests.length; i++) {
                    var s = t.requests[i];
                    s.collectionId = t.id,
                    s.id = guid(),
                    pm.indexedDB.addCollectionRequest(s, function(e) {}),
                    r.push(s)
                }
                t.requests = r,
                pm.collections.render(t)
            })
        })
    },
    getCollectionRequest: function(e) {
        pm.indexedDB.getCollectionRequest(e, function(t) {
            pm.request.isFromCollection = !0,
            pm.request.collectionRequestId = e,
            pm.request.loadRequestInEditor(t, !0)
        })
    },
    openCollection: function(e) {
        var t = "#collection-requests-" + e;
        $(t).css("display") === "none" && $(t).slideDown(100, function() {
            pm.layout.refreshScrollPanes()
        })
    },
    toggleRequestList: function(e) {
        var t = "#collection-requests-" + e
          , n = "#collection-" + e + " .collection-head-actions .label";
        $(t).css("display") === "none" ? $(t).slideDown(100, function() {
            pm.layout.refreshScrollPanes()
        }) : $(t).slideUp(100, function() {
            pm.layout.refreshScrollPanes()
        })
    },
    addCollection: function() {
        var e = $("#new-collection-blank").val()
          , t = new Collection;
        e && (t.id = guid(),
        t.name = e,
        pm.indexedDB.addCollection(t, function(e) {
            pm.collections.render(e)
        }),
        $("#new-collection-blank").val("")),
        $("#modal-new-collection").modal("hide")
    },
    updateCollectionFromCurrentRequest: function() {
        var e = $("#url").val()
          , t = new CollectionRequest;
        t.id = pm.request.collectionRequestId,
        t.headers = pm.request.getPackedHeaders(),
        t.url = e,
        t.method = pm.request.method,
        t.data = pm.request.body.getData(),
        t.dataMode = pm.request.dataMode,
        t.time = (new Date).getTime(),
        pm.indexedDB.getCollectionRequest(t.id, function(e) {
            t.name = e.name,
            t.description = e.description,
            t.collectionId = e.collectionId,
            $("#sidebar-request-" + e.id + " .request .label").removeClass("label-method-" + e.method),
            pm.indexedDB.updateCollectionRequest(t, function(e) {
                var t;
                e.name == undefined && (e.name = e.url),
                t = limitStringLineWidth(e.name, 43),
                $("#sidebar-request-" + e.id + " .request .request-name").html(t),
                $("#sidebar-request-" + e.id + " .request .label").html(e.method),
                $("#sidebar-request-" + e.id + " .request .label").addClass("label-method-" + e.method),
                noty({
                    type: "success",
                    text: "Saved request",
                    layout: "topRight",
                    timeout: 750
                })
            })
        })
    },
    addRequestToCollection: function() {
        var e = $("#select-collection").val()
          , t = $("#new-collection").val()
          , n = $("#new-request-name").val()
          , r = $("#new-request-description").val()
          , i = $("#url").val();
        n === "" && (n = i);
        var s = new Collection
          , o = new CollectionRequest;
        o.id = guid(),
        o.headers = pm.request.getPackedHeaders(),
        o.url = i,
        o.method = pm.request.method,
        o.data = pm.request.body.getData(),
        o.dataMode = pm.request.dataMode,
        o.name = n,
        o.description = r,
        o.time = (new Date).getTime(),
        t ? (s.id = guid(),
        s.name = t,
        pm.indexedDB.addCollection(s, function(e) {
            $("#sidebar-section-collections .empty-message").css("display", "none"),
            $("#new-collection").val(""),
            o.collectionId = e.id,
            $("#select-collection").append(Handlebars.templates.item_collection_selector_list(e)),
            $("#collection-items").append(Handlebars.templates.item_collection_sidebar_head(e)),
            $('a[rel="tooltip"]').tooltip(),
            pm.layout.refreshScrollPanes(),
            pm.indexedDB.addCollectionRequest(o, function(e) {
                var t = "#collection-requests-" + e.collectionId;
                pm.urlCache.addUrl(e.url),
                typeof e.name == "undefined" && (e.name = e.url),
                e.name = limitStringLineWidth(e.name, 43),
                $(t).append(Handlebars.templates.item_collection_sidebar_request(e)),
                pm.layout.refreshScrollPanes(),
                pm.request.isFromCollection = !0,
                pm.request.collectionRequestId = o.id,
                $("#update-request-in-collection").css("display", "inline-block"),
                pm.collections.openCollection(o.collectionId)
            })
        })) : (s.id = e,
        o.collectionId = s.id,
        pm.indexedDB.addCollectionRequest(o, function(e) {
            var t = "#collection-requests-" + e.collectionId;
            pm.urlCache.addUrl(e.url),
            typeof e.name == "undefined" && (e.name = e.url),
            e.name = limitStringLineWidth(e.name, 43),
            $(t).append(Handlebars.templates.item_collection_sidebar_request(e)),
            pm.layout.refreshScrollPanes(),
            pm.request.isFromCollection = !0,
            pm.request.collectionRequestId = o.id,
            $("#update-request-in-collection").css("display", "inline-block"),
            pm.collections.openCollection(o.collectionId)
        })),
        pm.layout.sidebar.select("collections"),
        $("#request-meta").css("display", "block"),
        $("#request-name").css("display", "block"),
        $("#request-description").css("display", "block"),
        $("#request-name").html(n),
        $("#request-description").html(r),
        $('#sidebar-selectors a[data-id="collections"]').tab("show")
    },
    getAllCollections: function() {
        $("#collection-items").html(""),
        $("#select-collection").html("<option>Select</option>"),
        pm.indexedDB.getCollections(function(e) {
            pm.collections.items = e;
            var t = e.length;
            if (t == 0)
                $("#sidebar-section-collections").append(Handlebars.templates.message_no_collection({}));
            else
                for (var n = 0; n < t; n++) {
                    var r = e[n];
                    pm.indexedDB.getAllRequestsInCollection(r, function(e, t) {
                        e.requests = t,
                        console.log(e),
                        pm.collections.render(e)
                    })
                }
            pm.collections.areLoaded = !0,
            pm.layout.refreshScrollPanes()
        })
    },
    render: function(e) {
        $("#sidebar-section-collections .empty-message").css("display", "none");
        var t = $("#collection-" + e.id);
        t && t.remove(),
        $("#select-collection").append(Handlebars.templates.item_collection_selector_list(e)),
        $("#collection-items").append(Handlebars.templates.item_collection_sidebar_head(e)),
        $('a[rel="tooltip"]').tooltip();
        if ("requests"in e) {
            var n = e.id
              , r = e.requests
              , i = "#collection-requests-" + n
              , s = r.length;
            if (s > 0) {
                for (var o = 0; o < s; o++)
                    pm.urlCache.addUrl(r[o].url),
                    typeof r[o].name == "undefined" && (r[o].name = r[o].url),
                    r[o].name = limitStringLineWidth(r[o].name, 40);
                // @since 2022-11-16
                // 这里order为[]，会导致collection中所有的request数据不显示，
                // 暂未找到order是从何处设置的，这里补充一个length判断规避问题
                if (e.order && e.order.legnth > 0) {
                    var u = [];
                    for (var a = 0, f = e.order.length; a < f; a++) {
                        var l = _.find(r, function(t) {
                            return t.id == e["order"][a]
                        });
                        u.push(l)
                    }
                    r = u
                } else
                    r.sort(sortAlphabetical);
                console.log(r),
                $(i).append(Handlebars.templates.collection_sidebar({
                    items: r
                })),
                $(i).sortable({
                    update: function(e, t) {
                        var n = $(e.target).parents(".sidebar-collection-requests")
                          , r = $(e.target).parents(".sidebar-collection")
                          , i = $(r).attr("data-id")
                          , s = $(n).children("li")
                          , o = s.length
                          , u = [];
                        for (var a = 0; a < o; a++) {
                            var f = $(s[a]).attr("id")
                              , l = $("#" + f + " .request").attr("data-id");
                            u.push(l)
                        }
                        pm.indexedDB.getCollection(i, function(e) {
                            e.order = u,
                            pm.indexedDB.updateCollection(e, function(e) {})
                        })
                    }
                })
            }
        }
        pm.layout.refreshScrollPanes()
    },
    deleteCollectionRequest: function(e) {
        pm.indexedDB.deleteCollectionRequest(e, function() {
            pm.layout.sidebar.removeRequestFromHistory(e)
        })
    },
    deleteCollection: function(e) {
        pm.indexedDB.deleteCollection(e, function() {
            pm.layout.sidebar.removeCollection(e);
            var t = '#select-collection option[value="' + e + '"]';
            $(t).remove()
        })
    },
    saveResponseAsExample: function(e, t) {
        pm.indexedDB.getCollectionRequest(e, function(e) {
            e.exampleResponse = t,
            console.log(e),
            pm.indexedDB.updateCollectionRequest(e, function(e) {
                console.log(e)
            })
        })
    }
},
pm.editor = {
    mode: "html",
    codeMirror: null,
    charCount: 0,
    init: function() {
        CodeMirror.defineMode("links", function(e, t) {
            var n = {
                startState: function() {
                    return {
                        link: ""
                    }
                },
                token: function(e, t) {
                    if (e.eatSpace())
                        return null;
                    var n;
                    if (n = e.match(/https?:\/\/[^\\'"\n\t\s]*(?=[<"'\n\t\s])/, !1)) {
                        var r = e.match(/.*(?=https?:)/, !0);
                        if (r && r[0].length > 0)
                            return null;
                        var i = n[0];
                        if (i != t.link) {
                            t.link = n[0];
                            for (var s = 0; s < t.link.length; s++)
                                e.next();
                            return t.link = "",
                            "link"
                        }
                        return e.skipToEnd(),
                        null
                    }
                    return e.skipToEnd(),
                    null
                }
            };
            return CodeMirror.overlayParser(CodeMirror.getMode(e, t.backdrop || pm.editor.mode), n)
        })
    },
    toggleLineWrapping: function() {
        var e = pm.editor.codeMirror.getOption("lineWrapping");
        e === !0 ? ($("#response-body-line-wrapping").removeClass("active"),
        e = !1,
        pm.editor.codeMirror.setOption("lineWrapping", !1)) : ($("#response-body-line-wrapping").addClass("active"),
        e = !0,
        pm.editor.codeMirror.setOption("lineWrapping", !0)),
        pm.settings.set("lineWrapping", e)
    }
},
pm.envManager = {
    environments: [],
    globals: {},
    selectedEnv: null,
    selectedEnvironmentId: "",
    quicklook: {
        init: function() {
            pm.envManager.quicklook.refreshEnvironment(pm.envManager.selectedEnv),
            pm.envManager.quicklook.refreshGlobals(pm.envManager.globals)
        },
        removeEnvironmentData: function() {
            $("#environment-quicklook-environments h6").html("No environment"),
            $("#environment-quicklook-environments ul").html("")
        },
        refreshEnvironment: function(e) {
            if (!e)
                return;
            $("#environment-quicklook-environments h6").html(e.name),
            $("#environment-quicklook-environments ul").html(""),
            $("#environment-quicklook-environments ul").append(Handlebars.templates.environment_quicklook({
                items: e.values
            }))
        },
        refreshGlobals: function(e) {
            if (!e)
                return;
            $("#environment-quicklook-globals ul").html(""),
            $("#environment-quicklook-globals ul").append(Handlebars.templates.environment_quicklook({
                items: e
            }))
        },
        toggleDisplay: function() {
            var e = $("#environment-quicklook-content").css("display");
            e == "none" ? $("#environment-quicklook-content").css("display", "block") : $("#environment-quicklook-content").css("display", "none")
        }
    },
    init: function() {
        pm.envManager.initGlobals(),
        $("#environment-list").append(Handlebars.templates.environment_list({
            items: this.environments
        })),
        $("#environments-list").on("click", ".environment-action-delete", function() {
            var e = $(this).attr("data-id");
            $('a[rel="tooltip"]').tooltip("hide"),
            pm.envManager.deleteEnvironment(e)
        }),
        $("#environments-list").on("click", ".environment-action-edit", function() {
            var e = $(this).attr("data-id");
            pm.envManager.showEditor(e)
        }),
        $("#environments-list").on("click", ".environment-action-download", function() {
            var e = $(this).attr("data-id");
            pm.envManager.downloadEnvironment(e)
        }),
        $(".environment-action-back").on("click", function() {
            pm.envManager.showSelector()
        }),
        $("#environment-selector").on("click", ".environment-list-item", function() {
            var e = $(this).attr("data-id")
              , t = pm.envManager.getEnvironmentFromId(e);
            pm.envManager.selectedEnv = t,
            pm.settings.set("selectedEnvironmentId", t.id),
            pm.envManager.quicklook.refreshEnvironment(t),
            $("#environment-selector .environment-list-item-selected").html(t.name)
        }),
        $("#environment-selector").on("click", ".environment-list-item-noenvironment", function() {
            pm.envManager.selectedEnv = null,
            pm.settings.set("selectedEnvironmentId", ""),
            pm.envManager.quicklook.removeEnvironmentData(),
            $("#environment-selector .environment-list-item-selected").html("No environment")
        }),
        $("#environment-quicklook").on("mouseenter", function() {
            $("#environment-quicklook-content").css("display", "block")
        }),
        $("#environment-quicklook").on("mouseleave", function() {
            $("#environment-quicklook-content").css("display", "none")
        }),
        $("#environment-files-input").on("change", function(e) {
            var t = e.target.files;
            pm.envManager.importEnvironments(t),
            $("#environment-files-input").val("")
        }),
        $(".environments-actions-add").on("click", function() {
            pm.envManager.showEditor()
        }),
        $(".environments-actions-import").on("click", function() {
            pm.envManager.showImporter()
        }),
        $(".environments-actions-manage-globals").on("click", function() {
            pm.envManager.showGlobals()
        }),
        $(".environments-actions-add-submit").on("click", function() {
            var e = $("#environment-editor-id").val();
            e === "0" ? pm.envManager.addEnvironment() : pm.envManager.updateEnvironment(),
            $("#environment-editor-name").val(""),
            $("#environment-keyvaleditor").keyvalueeditor("reset", [])
        }),
        $(".environments-actions-add-back").on("click", function() {
            pm.envManager.saveGlobals(),
            pm.envManager.showSelector(),
            $("#environment-editor-name").val(""),
            $("#environment-keyvaleditor").keyvalueeditor("reset", [])
        }),
        $("#environments-list-help-toggle").on("click", function() {
            var e = $("#environments-list-help-detail").css("display");
            e === "none" ? ($("#environments-list-help-detail").css("display", "inline"),
            $(this).html("Hide")) : ($("#environments-list-help-detail").css("display", "none"),
            $(this).html("Tell me more"))
        });
        var e = {
            placeHolderKey: "Key",
            placeHolderValue: "Value",
            deleteButton: '<img class="deleteButton" src="img/delete.png">'
        };
        $("#environment-keyvaleditor").keyvalueeditor("init", e),
        $("#globals-keyvaleditor").keyvalueeditor("init", e),
        $("#globals-keyvaleditor").keyvalueeditor("reset", pm.envManager.globals),
        pm.envManager.quicklook.init()
    },
    getEnvironmentFromId: function(e) {
        var t = pm.envManager.environments
          , n = t.length;
        for (var r = 0; r < n; r++) {
            var i = t[r];
            if (e === i.id)
                return i
        }
        return !1
    },
    processString: function(e, t) {
        var n = t.length, r = e, i, s, o = pm.settings.get("variableDelimiter"), u = o.substring(0, 2), a = o.substring(o.length - 2);
        for (var f = 0; f < n; f++)
            i = u + t[f].key + a,
            s = new RegExp(i,"g"),
            r = r.replace(i, t[f].value);
        var l = pm.envManager.globals;
        n = l.length;
        for (f = 0; f < n; f++)
            i = u + l[f].key + a,
            s = new RegExp(i,"g"),
            r = r.replace(i, l[f].value);
        return r
    },
    convertString: function(e) {
        var t = pm.envManager.selectedEnv
          , n = [];
        return t !== null && (n = t.values),
        pm.envManager.processString(e, n)
    },
    getAllEnvironments: function() {
        pm.indexedDB.environments.getAllEnvironments(function(e) {
            $("#environment-selector .dropdown-menu").html(""),
            $("#environments-list tbody").html(""),
            pm.envManager.environments = e,
            $("#environment-selector .dropdown-menu").append(Handlebars.templates.environment_selector({
                items: e
            })),
            $("#environments-list tbody").append(Handlebars.templates.environment_list({
                items: e
            })),
            $("#environment-selector .dropdown-menu").append(Handlebars.templates.environment_selector_actions());
            var t = pm.settings.get("selectedEnvironmentId")
              , n = pm.envManager.getEnvironmentFromId(t);
            n ? (pm.envManager.selectedEnv = n,
            pm.envManager.quicklook.refreshEnvironment(n),
            $("#environment-selector .environment-list-item-selected").html(n.name)) : (pm.envManager.selectedEnv = null,
            $("#environment-selector .environment-list-item-selected").html("No environment"))
        })
    },
    initGlobals: function() {
        if ("globals"in localStorage) {
            var e = localStorage.globals;
            pm.envManager.globals = JSON.parse(e)
        } else
            pm.envManager.globals = []
    },
    saveGlobals: function() {
        var e = $("#globals-keyvaleditor").keyvalueeditor("getValues");
        pm.envManager.globals = e,
        pm.envManager.quicklook.refreshGlobals(e),
        localStorage.globals = JSON.stringify(e)
    },
    showSelector: function() {
        $("#environments-list-wrapper").css("display", "block"),
        $("#environment-editor").css("display", "none"),
        $("#environment-importer").css("display", "none"),
        $("#globals-editor").css("display", "none"),
        $(".environments-actions-add-submit").css("display", "inline"),
        $("#modal-environments .modal-footer").css("display", "none")
    },
    showEditor: function(e) {
        if (e) {
            var t = pm.envManager.getEnvironmentFromId(e);
            $("#environment-editor-name").val(t.name),
            $("#environment-editor-id").val(e),
            $("#environment-keyvaleditor").keyvalueeditor("reset", t.values)
        } else
            $("#environment-editor-id").val(0);
        $("#environments-list-wrapper").css("display", "none"),
        $("#environment-editor").css("display", "block"),
        $("#globals-editor").css("display", "none"),
        $("#modal-environments .modal-footer").css("display", "block")
    },
    showImporter: function() {
        $("#environments-list-wrapper").css("display", "none"),
        $("#environment-editor").css("display", "none"),
        $("#globals-editor").css("display", "none"),
        $("#environment-importer").css("display", "block"),
        $(".environments-actions-add-submit").css("display", "none"),
        $("#modal-environments .modal-footer").css("display", "block")
    },
    showGlobals: function() {
        $("#environments-list-wrapper").css("display", "none"),
        $("#environment-editor").css("display", "none"),
        $("#globals-editor").css("display", "block"),
        $("#environment-importer").css("display", "none"),
        $(".environments-actions-add-submit").css("display", "none"),
        $("#modal-environments .modal-footer").css("display", "block")
    },
    addEnvironment: function() {
        var e = $("#environment-editor-name").val()
          , t = $("#environment-keyvaleditor").keyvalueeditor("getValues")
          , n = {
            id: guid(),
            name: e,
            values: t,
            timestamp: (new Date).getTime()
        };
        pm.indexedDB.environments.addEnvironment(n, function() {
            pm.envManager.getAllEnvironments(),
            pm.envManager.showSelector()
        })
    },
    updateEnvironment: function() {
        var e = $("#environment-editor-id").val()
          , t = $("#environment-editor-name").val()
          , n = $("#environment-keyvaleditor").keyvalueeditor("getValues")
          , r = {
            id: e,
            name: t,
            values: n,
            timestamp: (new Date).getTime()
        };
        pm.indexedDB.environments.updateEnvironment(r, function() {
            pm.envManager.getAllEnvironments(),
            pm.envManager.showSelector()
        })
    },
    deleteEnvironment: function(e) {
        pm.indexedDB.environments.deleteEnvironment(e, function() {
            pm.envManager.getAllEnvironments(),
            pm.envManager.showSelector()
        })
    },
    downloadEnvironment: function(e) {
        var t = pm.envManager.getEnvironmentFromId(e)
          , n = t.name + "-environment.json"
          , r = "application/json"
          , i = JSON.stringify(t);
        pm.filesystem.saveAndOpenFile(n, i, r, function() {})
    },
    importEnvironments: function(e) {
        for (var t = 0, n; n = e[t]; t++) {
            var r = new FileReader;
            r.onload = function(e) {
                return function(e) {
                    var t = e.currentTarget.result
                      , n = JSON.parse(t);
                    pm.indexedDB.environments.addEnvironment(n, function() {
                        var e = {
                            name: n.name,
                            action: "added"
                        };
                        $("#environment-importer-confirmations").append(Handlebars.templates.message_environment_added(e)),
                        pm.envManager.getAllEnvironments()
                    })
                }
            }(n),
            r.readAsText(n)
        }
    }
},
pm.filesystem = {
    fs: {},
    onInitFs: function(e) {
        pm.filesystem.fs = e
    },
    errorHandler: function(e) {
        var t = "";
        switch (e.code) {
        case FileError.QUOTA_EXCEEDED_ERR:
            t = "QUOTA_EXCEEDED_ERR";
            break;
        case FileError.NOT_FOUND_ERR:
            t = "NOT_FOUND_ERR";
            break;
        case FileError.SECURITY_ERR:
            t = "SECURITY_ERR";
            break;
        case FileError.INVALID_MODIFICATION_ERR:
            t = "INVALID_MODIFICATION_ERR";
            break;
        case FileError.INVALID_STATE_ERR:
            t = "INVALID_STATE_ERR";
            break;
        default:
            t = "Unknown Error"
        }
        console.log("Error: " + t)
    },
    init: function() {
        window.requestFileSystem(window.TEMPORARY, 5242880, this.onInitFs, this.errorHandler)
    },
    removeFileIfExists: function(e, t) {
        pm.filesystem.fs.root.getFile(e, {
            create: !1
        }, function(e) {
            e.remove(function() {
                t()
            }, function() {
                t()
            })
        }, function() {
            t()
        })
    },
    renderResponsePreview: function(e, t, n, r) {
        e = encodeURI(e),
        e = e.replace("/", "_"),
        pm.filesystem.removeFileIfExists(e, function() {
            pm.filesystem.fs.root.getFile(e, {
                create: !0
            }, function(e) {
                e.createWriter(function(i) {
                    i.onwriteend = function(t) {
                        var n = {
                            url: e.toURL()
                        };
                        r(n.url)
                    }
                    ,
                    i.onerror = function(e) {
                        r(!1)
                    }
                    ;
                    var s;
                    n == "pdf" ? s = new Blob([t],{
                        type: "application/pdf"
                    }) : s = new Blob([t],{
                        type: "text/plain"
                    }),
                    i.write(s)
                }, pm.filesystem.errorHandler)
            }, pm.filesystem.errorHandler)
        })
    },
    saveAndOpenFile: function(e, t, n, r) {
        e = encodeURI(e),
        e = e.replace("/", "_"),
        pm.filesystem.removeFileIfExists(e, function() {
            pm.filesystem.fs.root.getFile(e, {
                create: !0
            }, function(e) {
                e.createWriter(function(i) {
                    i.onwriteend = function(t) {
                        var n = {
                            url: e.toURL()
                        };
                        typeof chrome != "undefined" && chrome.tabs.create(n, function(e) {}),
                        r()
                    }
                    ,
                    i.onerror = function(e) {
                        r()
                    }
                    ;
                    var s;
                    n == "pdf" ? s = new Blob([t],{
                        type: "application/pdf"
                    }) : s = new Blob([t],{
                        type: "text/plain"
                    }),
                    i.write(s)
                }, pm.filesystem.errorHandler)
            }, pm.filesystem.errorHandler)
        })
    }
},
pm.helpers = {
    init: function() {
        $("#request-types .request-helper-tabs li").on("click", function() {
            $("#request-types .request-helper-tabs li").removeClass("active"),
            $(this).addClass("active");
            var e = $(this).attr("data-id");
            pm.helpers.showRequestHelper(e)
        }),
        $(".request-helper-submit").on("click", function() {
            var e = $(this).attr("data-type");
            $("#request-helpers").css("display", "none"),
            pm.helpers.processRequestHelper(e)
        })
    },
    processRequestHelper: function(e) {
        return e === "basic" ? this.basic.process() : e === "oAuth1" && this.oAuth1.process(),
        !1
    },
    showRequestHelper: function(e) {
        return $("#request-types ul li").removeClass("active"),
        $("#request-types ul li[data-id=" + e + "]").addClass("active"),
        e !== "normal" ? $("#request-helpers").css("display", "block") : $("#request-helpers").css("display", "none"),
        e.toLowerCase() === "oauth1" && this.oAuth1.generateHelper(),
        $(".request-helpers").css("display", "none"),
        $("#request-helper-" + e).css("display", "block"),
        !1
    },
    basic: {
        process: function() {
            var e = pm.request.headers
              , t = "Authorization"
              , n = findPosition(e, "key", t)
              , r = $("#request-helper-basicAuth-username").val()
              , i = $("#request-helper-basicAuth-password").val();
            r = pm.envManager.convertString(r),
            i = pm.envManager.convertString(i);
            var s = r + ":" + i
              , o = "Basic " + btoa(s);
            n >= 0 ? e[n] = {
                key: t,
                name: t,
                value: o
            } : e.push({
                key: t,
                name: t,
                value: o
            }),
            pm.request.headers = e,
            $("#headers-keyvaleditor").keyvalueeditor("reset", e),
            pm.request.openHeaderEditor()
        }
    },
    oAuth1: {
        generateHelper: function() {
            $("#request-helper-oauth1-timestamp").val(OAuth.timestamp()),
            $("#request-helper-oauth1-nonce").val(OAuth.nonce(6))
        },
        generateSignature: function() {
            if ($("#url").val() === "")
                return $("#request-helpers").css("display", "block"),
                alert("Please enter the URL first."),
                null;
            var e = pm.envManager.convertString($("#url").val()).trim();
            e = ensureProperUrl(e),
            e.indexOf("?") > 0 && (e = e.split("?")[0]);
            var t = {
                action: e,
                method: pm.request.method,
                parameters: []
            };
            $("input.signatureParam").each(function() {
                if ($(this).val() != "") {
                    var e = $(this).val();
                    e = pm.envManager.convertString(e),
                    t.parameters.push([$(this).attr("key"), e])
                }
            });
            var n = $("#url-keyvaleditor").keyvalueeditor("getValues")
              , r = [];
            pm.request.isMethodWithBody(pm.request.method) && (pm.request.body.mode == "params" ? r = $("#formdata-keyvaleditor").keyvalueeditor("getValues") : pm.request.body.mode == "urlencoded" && (r = $("#urlencoded-keyvaleditor").keyvalueeditor("getValues")));
            var i = n.concat(r);
            for (var s = 0; s < i.length; s++) {
                var o = i[s];
                o.key && (o.value = pm.envManager.convertString(o.value),
                t.parameters.push([o.key, o.value]))
            }
            var u = {};
            return $('input[key="oauth_consumer_secret"]').val() != "" && (u.consumerSecret = $('input[key="oauth_consumer_secret"]').val(),
            u.consumerSecret = pm.envManager.convertString(u.consumerSecret)),
            $('input[key="oauth_token_secret"]').val() != "" && (u.tokenSecret = $('input[key="oauth_token_secret"]').val(),
            u.tokenSecret = pm.envManager.convertString(u.tokenSecret)),
            OAuth.SignatureMethod.sign(t, u)
        },
        process: function() {
            var e = []
              , t = pm.request.getUrlEditorParams()
              , n = [];
            pm.request.body.mode == "params" ? n = $("#formdata-keyvaleditor").keyvalueeditor("getValues") : pm.request.body.mode == "urlencoded" && (n = $("#urlencoded-keyvaleditor").keyvalueeditor("getValues")),
            e = e.concat(t),
            e = e.concat(n);
            var r = "oauth_signature";
            $("input.signatureParam").each(function() {
                if ($(this).val() != "") {
                    var t = $(this).val();
                    e.push({
                        key: $(this).attr("key"),
                        value: t
                    })
                }
            });
            for (var i = 0, s = e.length; i < s; i++)
                e[i].value = pm.envManager.convertString(e[i].value);
            var o = this.generateSignature();
            if (o == null)
                return;
            e.push({
                key: r,
                value: o
            });
            var u = $("#request-helper-oauth1-header").attr("checked") ? !0 : !1;
            if (u) {
                var a = pm.envManager.convertString($("#url").val()).trim();
                a.indexOf("?") > 0 && (a = a.split("?")[0]);
                var f = pm.request.headers
                  , l = "Authorization"
                  , c = findPosition(f, "key", l)
                  , h = 'OAuth realm="' + a + '",'
                  , p = e.length;
                for (i = 0; i < p; i++)
                    h += encodeURIComponent(e[i].key) + '="' + encodeURIComponent(e[i].value) + '",';
                h = h.substring(0, h.length - 1),
                c >= 0 ? f[c] = {
                    key: l,
                    name: l,
                    value: h
                } : f.push({
                    key: l,
                    name: l,
                    value: h
                }),
                pm.request.headers = f,
                $("#headers-keyvaleditor").keyvalueeditor("reset", f),
                pm.request.openHeaderEditor()
            } else if (pm.request.method === "GET")
                $("#url-keyvaleditor").keyvalueeditor("reset", e),
                pm.request.setUrlParamString(e),
                pm.request.openUrlEditor();
            else {
                var d = pm.request.body.getDataMode();
                d === "urlencoded" ? $("#urlencoded-keyvaleditor").keyvalueeditor("reset", e) : d === "params" && $("#formdata-keyvaleditor").keyvalueeditor("reset", e)
            }
        }
    }
},
pm.history = {
    requests: {},
    init: function() {
        $(".history-actions-delete").click(function() {
            pm.history.clear()
        })
    },
    showEmptyMessage: function() {
        $("#emptyHistoryMessage").css("display", "block")
    },
    hideEmptyMessage: function() {
        $("#emptyHistoryMessage").css("display", "none")
    },
    requestExists: function(e) {
        var t = -1
          , n = e.method.toLowerCase();
        if (pm.request.isMethodWithBody(n))
            return -1;
        var r = this.requests
          , i = r.length;
        for (var s = 0; s < i; s++) {
            var o = r[s];
            o.url.length !== e.url.length || o.headers.length !== e.headers.length || o.method !== e.method ? t = -1 : o.url === e.url && o.headers === e.headers && (t = s);
            if (t >= 0)
                break
        }
        return t
    },
    getAllRequests: function() {
        pm.indexedDB.getAllRequestItems(function(e) {
            var t = []
              , n = e.length;
            if (n === 0)
                $("#sidebar-section-history").append(Handlebars.templates.message_no_history({}));
            else {
                for (var r = 0; r < n; r++) {
                    var i = e[r];
                    pm.urlCache.addUrl(i.url);
                    var s = e[r].url;
                    s.length > 80 && (s = s.substring(0, 80) + "..."),
                    s = limitStringLineWidth(s, 40);
                    var o = {
                        url: s,
                        method: e[r].method,
                        id: e[r].id,
                        position: "top"
                    };
                    t.push(o)
                }
                t.reverse(),
                $("#history-items").append(Handlebars.templates.history_sidebar_requests({
                    items: t
                })),
                $("#history-items").fadeIn()
            }
            pm.history.requests = e,
            pm.layout.refreshScrollPanes()
        })
    },
    loadRequest: function(e) {
        pm.indexedDB.getRequest(e, function(e) {
            pm.request.isFromCollection = !1,
            pm.request.loadRequestInEditor(e)
        })
    },
    addRequest: function(e, t, n, r, i) {
        var s = guid()
          , o = pm.settings.get("historyCount")
          , u = this.requests
          , a = this.requests.length;
        if (a >= o) {
            var f = u[a - 1];
            this.deleteRequest(f.id)
        }
        var l = {
            id: s,
            url: e.toString(),
            method: t.toString(),
            headers: n.toString(),
            data: r.toString(),
            dataMode: i.toString(),
            timestamp: (new Date).getTime()
        }
          , c = this.requestExists(l);
        if (c >= 0) {
            var h = u[c].id;
            this.deleteRequest(h)
        }
        pm.indexedDB.addRequest(l, function(e) {
            pm.urlCache.addUrl(e.url),
            pm.layout.sidebar.addRequest(e.url, e.method, s, "top"),
            pm.history.requests.push(e)
        })
    },
    deleteRequest: function(e) {
        pm.indexedDB.deleteRequest(e, function(e) {
            var t = pm.history.requests
              , n = -1
              , r = t.length;
            for (var i = 0; i < r; i++)
                if (t[i].id === e) {
                    n = i;
                    break
                }
            n >= 0 && t.splice(n, 1),
            pm.layout.sidebar.removeRequestFromHistory(e)
        })
    },
    clear: function() {
        pm.indexedDB.deleteHistory(function() {
            $("#history-items").html("")
        })
    }
},
pm.indexedDB = {
    onerror: function(e, t) {
        console.log(e)
    },
    open_v21: function() {
        var e = curIndexDB.open("postman", "POSTman request history");
        e.onsuccess = function(e) {
            var t = "0.47";
            pm.indexedDB.db = e.target.result;
            var n = pm.indexedDB.db;
            if (t !== n.version) {
                var r = n.setVersion(t);
                r.onfailure = function(e) {
                    console.log(e)
                }
                ,
                r.onsuccess = function(e) {
                    if (!n.objectStoreNames.contains("requests")) {
                        var t = n.createObjectStore("requests", {
                            keyPath: "id"
                        });
                        t.createIndex("timestamp", "timestamp", {
                            unique: !1
                        })
                    }
                    if (!n.objectStoreNames.contains("collections")) {
                        var r = n.createObjectStore("collections", {
                            keyPath: "id"
                        });
                        r.createIndex("timestamp", "timestamp", {
                            unique: !1
                        })
                    }
                    if (!n.objectStoreNames.contains("collection_requests")) {
                        var i = n.createObjectStore("collection_requests", {
                            keyPath: "id"
                        });
                        i.createIndex("timestamp", "timestamp", {
                            unique: !1
                        }),
                        i.createIndex("collectionId", "collectionId", {
                            unique: !1
                        })
                    }
                    if (!n.objectStoreNames.contains("environments")) {
                        var s = n.createObjectStore("environments", {
                            keyPath: "id"
                        });
                        s.createIndex("timestamp", "timestamp", {
                            unique: !1
                        }),
                        s.createIndex("id", "id", {
                            unique: !1
                        })
                    }
                    var o = e.target.result;
                    o.oncomplete = function() {
                        pm.history.getAllRequests(),
                        pm.envManager.getAllEnvironments()
                    }
                }
                ,
                r.onupgradeneeded = function(e) {}
            } else
                pm.history.getAllRequests(),
                pm.envManager.getAllEnvironments()
        }
        ,
        e.onfailure = pm.indexedDB.onerror
    },
    open_latest: function() {
        var e = 9
          , t = curIndexDB.open("postman", e);
        console.log("Open latest"),
        t.onupgradeneeded = function(e) {
            var t = e.target.result;
            pm.indexedDB.db = t;
            if (!t.objectStoreNames.contains("requests")) {
                var n = t.createObjectStore("requests", {
                    keyPath: "id"
                });
                n.createIndex("timestamp", "timestamp", {
                    unique: !1
                })
            }
            if (!t.objectStoreNames.contains("collections")) {
                var r = t.createObjectStore("collections", {
                    keyPath: "id"
                });
                r.createIndex("timestamp", "timestamp", {
                    unique: !1
                })
            }
            if (!t.objectStoreNames.contains("collection_requests")) {
                var i = t.createObjectStore("collection_requests", {
                    keyPath: "id"
                });
                i.createIndex("timestamp", "timestamp", {
                    unique: !1
                }),
                i.createIndex("collectionId", "collectionId", {
                    unique: !1
                })
            }
            if (!t.objectStoreNames.contains("environments")) {
                var s = t.createObjectStore("environments", {
                    keyPath: "id"
                });
                s.createIndex("timestamp", "timestamp", {
                    unique: !1
                }),
                s.createIndex("id", "id", {
                    unique: !1
                })
            }
        }
        ,
        t.onsuccess = function(e) {
            pm.indexedDB.db = e.target.result,
            pm.history.getAllRequests(),
            pm.envManager.getAllEnvironments()
        }
        ,
        t.onerror = pm.indexedDB.onerror
    },
    open: function() {
        parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]) < 23 ? pm.indexedDB.open_v21() : pm.indexedDB.open_latest()
    },
    addCollection: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collections"], "readwrite")
          , i = r.objectStore("collections")
          , s = i.put({
            id: e.id,
            name: e.name,
            timestamp: (new Date).getTime()
        });
        s.onsuccess = function() {
            t(e)
        }
        ,
        s.onerror = function(e) {
            console.log(e.value)
        }
    },
    updateCollection: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collections"], "readwrite")
          , i = r.objectStore("collections")
          , s = IDBKeyRange.only(e.id)
          , o = i.put(e);
        o.onsuccess = function(n) {
            t(e)
        }
        ,
        o.onerror = function(e) {
            console.log(e.value)
        }
    },
    addCollectionRequest: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collection_requests"], "readwrite")
          , i = r.objectStore("collection_requests")
          , s = i.put({
            collectionId: e.collectionId,
            id: e.id,
            name: e.name,
            description: e.description,
            url: e.url.toString(),
            method: e.method.toString(),
            headers: e.headers.toString(),
            data: e.data.toString(),
            dataMode: e.dataMode.toString(),
            timestamp: e.timestamp
        });
        s.onsuccess = function() {
            t(e)
        }
        ,
        s.onerror = function(e) {
            console.log(e.value)
        }
    },
    updateCollectionRequest: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collection_requests"], "readwrite")
          , i = r.objectStore("collection_requests")
          , s = IDBKeyRange.only(e.id)
          , o = i.put(e);
        o.onsuccess = function(n) {
            t(e)
        }
        ,
        o.onerror = function(e) {
            console.log(e.value)
        }
    },
    getCollection: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collections"], "readwrite")
          , i = r.objectStore("collections")
          , s = i.get(e);
        s.onsuccess = function(e) {
            var n = e.target.result;
            t(n)
        }
        ,
        s.onerror = pm.indexedDB.onerror
    },
    getCollections: function(e) {
        var t = pm.indexedDB.db;
        if (t == null)
            return;
        var n = t.transaction(["collections"], "readwrite")
          , r = n.objectStore("collections")
          , i = IDBKeyRange.lowerBound(0)
          , s = r.openCursor(i)
          , o = 0
          , u = [];
        s.onsuccess = function(t) {
            var n = t.target.result;
            if (!n) {
                e(u);
                return
            }
            var r = n.value;
            o++,
            u.push(r),
            n["continue"]()
        }
        ,
        s.onerror = function(e) {
            console.log(e)
        }
    },
    getAllRequestsInCollection: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collection_requests"], "readwrite")
          , i = IDBKeyRange.only(e.id)
          , s = r.objectStore("collection_requests")
          , o = s.index("collectionId")
          , u = o.openCursor(i)
          , a = [];
        u.onsuccess = function(n) {
            var r = n.target.result;
            if (!r) {
                t(e, a);
                return
            }
            var i = r.value;
            a.push(i),
            r["continue"]()
        }
        ,
        u.onerror = pm.indexedDB.onerror
    },
    addRequest: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["requests"], "readwrite")
          , i = r.objectStore("requests")
          , s = i.put(e);
        s.onsuccess = function(n) {
            t(e)
        }
        ,
        s.onerror = function(e) {
            console.log(e.value)
        }
    },
    getRequest: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["requests"], "readwrite")
          , i = r.objectStore("requests")
          , s = i.get(e);
        s.onsuccess = function(e) {
            var n = e.target.result;
            if (!n)
                return;
            t(n)
        }
        ,
        s.onerror = pm.indexedDB.onerror
    },
    getCollectionRequest: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collection_requests"], "readwrite")
          , i = r.objectStore("collection_requests")
          , s = i.get(e);
        s.onsuccess = function(e) {
            var n = e.target.result;
            if (!n)
                return;
            return t(n),
            n
        }
        ,
        s.onerror = pm.indexedDB.onerror
    },
    getAllRequestItems: function(e) {
        var t = pm.indexedDB.db;
        if (t == null)
            return;
        var n = t.transaction(["requests"], "readwrite")
          , r = n.objectStore("requests")
          , i = IDBKeyRange.lowerBound(0)
          , s = r.index("timestamp")
          , o = s.openCursor(i)
          , u = [];
        o.onsuccess = function(t) {
            var n = t.target.result;
            if (!n) {
                e(u);
                return
            }
            var r = n.value;
            u.push(r),
            n["continue"]()
        }
        ,
        o.onerror = pm.indexedDB.onerror
    },
    deleteRequest: function(e, t) {
        try {
            var n = pm.indexedDB.db
              , r = n.transaction(["requests"], "readwrite")
              , i = r.objectStore(["requests"])
              , s = i["delete"](e);
            s.onsuccess = function() {
                t(e)
            }
            ,
            s.onerror = function(e) {
                console.log(e)
            }
        } catch (o) {
            console.log(o)
        }
    },
    deleteHistory: function(e) {
        var t = pm.indexedDB.db
          , n = t.transaction(["requests"], "readwrite")
          , r = n.objectStore(["requests"]).clear();
        r.onsuccess = function(t) {
            e()
        }
    },
    deleteCollectionRequest: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collection_requests"], "readwrite")
          , i = r.objectStore(["collection_requests"])
          , s = i["delete"](e);
        s.onsuccess = function(n) {
            t(e)
        }
        ,
        s.onerror = function(e) {
            console.log(e)
        }
    },
    deleteAllCollectionRequests: function(e) {
        var t = pm.indexedDB.db
          , n = t.transaction(["collection_requests"], "readwrite")
          , r = IDBKeyRange.only(e)
          , i = n.objectStore("collection_requests")
          , s = i.index("collectionId")
          , o = s.openCursor(r);
        o.onsuccess = function(e) {
            var t = e.target.result;
            if (!t)
                return;
            var n = t.value;
            pm.collections.deleteCollectionRequest(n.id),
            t["continue"]()
        }
        ,
        o.onerror = pm.indexedDB.onerror
    },
    deleteCollection: function(e, t) {
        var n = pm.indexedDB.db
          , r = n.transaction(["collections"], "readwrite")
          , i = r.objectStore(["collections"])
          , s = i["delete"](e);
        s.onsuccess = function() {
            pm.indexedDB.deleteAllCollectionRequests(e),
            t(e)
        }
        ,
        s.onerror = function(e) {
            console.log(e)
        }
    },
    environments: {
        addEnvironment: function(e, t) {
            var n = pm.indexedDB.db
              , r = n.transaction(["environments"], "readwrite")
              , i = r.objectStore("environments")
              , s = i.put(e);
            s.onsuccess = function(n) {
                t(e)
            }
            ,
            s.onerror = function(e) {
                console.log(e)
            }
        },
        getEnvironment: function(e, t) {
            var n = pm.indexedDB.db
              , r = n.transaction(["environments"], "readwrite")
              , i = r.objectStore("environments")
              , s = i.get(e);
            s.onsuccess = function(e) {
                var n = e.target.result;
                t(n)
            }
            ,
            s.onerror = pm.indexedDB.onerror
        },
        deleteEnvironment: function(e, t) {
            var n = pm.indexedDB.db
              , r = n.transaction(["environments"], "readwrite")
              , i = r.objectStore(["environments"])
              , s = i["delete"](e);
            s.onsuccess = function() {
                t(e)
            }
            ,
            s.onerror = function(e) {
                console.log(e)
            }
        },
        getAllEnvironments: function(e) {
            var t = pm.indexedDB.db;
            if (t == null)
                return;
            var n = t.transaction(["environments"], "readwrite")
              , r = n.objectStore("environments")
              , i = IDBKeyRange.lowerBound(0)
              , s = r.index("timestamp")
              , o = s.openCursor(i)
              , u = [];
            o.onsuccess = function(t) {
                var n = t.target.result;
                if (!n) {
                    e(u);
                    return
                }
                var r = n.value;
                u.push(r),
                n["continue"]()
            }
            ,
            o.onerror = pm.indexedDB.onerror
        },
        updateEnvironment: function(e, t) {
            var n = pm.indexedDB.db
              , r = n.transaction(["environments"], "readwrite")
              , i = r.objectStore("environments")
              , s = IDBKeyRange.only(e.id)
              , o = i.put(e);
            o.onsuccess = function(n) {
                t(e)
            }
            ,
            o.onerror = function(e) {
                console.log(e.value)
            }
        }
    }
},
pm.keymap = {
    init: function() {
        var e = function() {
            return pm.history.clear(),
            !1
        }
          , t = function() {
            return $("#url").focus(),
            !1
        }
          , n = function() {
            pm.request.startNew()
        };
        $("body").on("keydown", "input", function(e) {
            return e.keyCode === 27 ? $(e.target).blur() : e.keyCode == 13 && pm.request.send("text"),
            !0
        }),
        $("body").on("keydown", "textarea", function(e) {
            e.keyCode === 27 && $(e.target).blur()
        }),
        $("body").on("keydown", "select", function(e) {
            e.keyCode === 27 && $(e.target).blur()
        }),
        $(document).bind("keydown", "alt+c", e),
        $(document).bind("keydown", "backspace", t),
        $(document).bind("keydown", "alt+n", n),
        $(document).bind("keydown", "q", function() {
            return pm.envManager.quicklook.toggleDisplay(),
            !1
        }),
        $(document).bind("keydown", "e", function() {
            $("#modal-environments").modal({
                keyboard: !0,
                backdrop: "static"
            })
        }),
        $(document).bind("keydown", "h", function() {
            return pm.request.openHeaderEditor(),
            $("#headers-keyvaleditor div:first-child input:first-child").focus(),
            !1
        }),
        $(document).bind("keydown", "return", function() {
            return pm.request.send("text"),
            !1
        }),
        $(document).bind("keydown", "p", function() {
            if (pm.request.isMethodWithBody(pm.request.method))
                return $("#formdata-keyvaleditor div:first-child input:first-child").focus(),
                !1
        }),
        $(document).bind("keydown", "f", function() {
            pm.request.response.toggleBodySize()
        }),
        $(document).bind("keydown", "shift+/", function() {
            $("#modal-shortcuts").modal("show")
        }),
        $(document).bind("keydown", "a", function() {
            return pm.collections.areLoaded === !1 && pm.collections.getAllCollections(),
            $("#modal-add-to-collection").modal({
                keyboard: !0,
                backdrop: "static"
            }),
            $("#modal-add-to-collection").modal("show"),
            $("#new-request-name").val(""),
            $("#new-request-description").val(""),
            !1
        })
    }
},
pm.layout = {
    socialButtons: {
        facebook: '<iframe src="http://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fchrome.google.com%2Fwebstore%2Fdetail%2Ffdmmgilgnpjigdojojpjoooidkmcomcm&amp;send=false&amp;layout=button_count&amp;width=250&amp;show_faces=true&amp;action=like&amp;colorscheme=light&amp;font&amp;height=21&amp;appId=26438002524" scrolling="no" frameborder="0" style="border:none; overflow:hidden; width:250px; height:21px;" allowTransparency="true"></iframe>',
        twitter: '<a href="https://twitter.com/share" class="twitter-share-button" data-url="https://chrome.google.com/webstore/detail/fdmmgilgnpjigdojojpjoooidkmcomcm" data-text="I am using Postman to super-charge REST API testing and development!" data-count="horizontal" data-via="postmanclient">Tweet</a><script type="text/javascript" src="https://platform.twitter.com/widgets.js"></script>',
        plusOne: '<script type="text/javascript" src="https://apis.google.com/js/plusone.js"></script><g:plusone size="medium" href="https://chrome.google.com/webstore/detail/fdmmgilgnpjigdojojpjoooidkmcomcm"></g:plusone>'
    },
    init: function() {
        $("#sidebar-footer").on("click", function() {
            $("#modal-spread-the-word").modal("show"),
            pm.layout.attachSocialButtons()
        }),
        $("#response-body-toggle").on("click", function() {
            pm.request.response.toggleBodySize()
        }),
        $("#response-body-line-wrapping").on("click", function() {
            return pm.editor.toggleLineWrapping(),
            !0
        }),
        $("#response-open-in-new-window").on("click", function() {
            var e = pm.request.response.text;
            pm.request.response.openInNewWindow(e)
        }),
        $("#response-formatting").on("click", "a", function() {
            var e = $(this).attr("data-type");
            pm.request.response.changePreviewType(e)
        }),
        $("#response-language").on("click", "a", function() {
            var e = $(this).attr("data-mode");
            pm.request.response.setMode(e)
        }),
        $("#response-example-save").on("click", function() {
            var e = pm.request.response
              , t = {
                responseCode: e.responseCode,
                time: e.time,
                headers: e.headers,
                cookies: e.cookies,
                text: e.text
            };
            pm.collections.saveResponseAsExample(pm.request.collectionRequestId, t)
        }),
        this.sidebar.init(),
        pm.request.response.clear(),
        $("#add-to-collection").on("click", function() {
            pm.collections.areLoaded === !1 && pm.collections.getAllCollections()
        }),
        $("#submit-request").on("click", function() {
            pm.request.send("text")
        }),
        $("#update-request-in-collection").on("click", function() {
            pm.collections.updateCollectionFromCurrentRequest()
        }),
        $("#cancel-request").on("click", function() {
            pm.request.cancel()
        }),
        $("#request-actions-reset").on("click", function() {
            pm.request.startNew()
        }),
        $("#request-method-selector").change(function() {
            var e = $(this).val();
            pm.request.setMethod(e)
        }),
        $("#sidebar-selectors li a").click(function() {
            var e = $(this).attr("data-id");
            pm.layout.sidebar.select(e)
        }),
        $('a[rel="tooltip"]').tooltip(),
        $("#form-add-to-collection").submit(function() {
            return pm.collections.addRequestToCollection(),
            $("#modal-add-to-collection").modal("hide"),
            !1
        }),
        $("#modal-add-to-collection .btn-primary").click(function() {
            pm.collections.addRequestToCollection(),
            $("#modal-add-to-collection").modal("hide")
        }),
        $("#form-new-collection").submit(function() {
            return pm.collections.addCollection(),
            !1
        }),
        $("#modal-new-collection .btn-primary").click(function() {
            return pm.collections.addCollection(),
            !1
        }),
        $("#modal-edit-collection .btn-primary").click(function() {
            var e = $("#form-edit-collection .collection-id").val()
              , t = $("#form-edit-collection .collection-name").val();
            pm.indexedDB.getCollection(e, function(e) {
                e.name = t,
                pm.indexedDB.updateCollection(e, function(e) {
                    $("#collection-" + e.id + " .sidebar-collection-head-name").html(e.name),
                    $('#select-collection option[value="' + e.id + '"]').html(e.name)
                })
            }),
            $("#modal-edit-collection").modal("hide")
        }),
        $("#modal-edit-collection-request .btn-primary").click(function() {
            var e = $("#form-edit-collection-request .collection-request-id").val()
              , t = $("#form-edit-collection-request .collection-request-name").val()
              , n = $("#form-edit-collection-request .collection-request-description").val();
            pm.indexedDB.getCollectionRequest(e, function(e) {
                e.name = t,
                e.description = n,
                pm.indexedDB.updateCollectionRequest(e, function(t) {
                    var n;
                    e.name != undefined ? n = limitStringLineWidth(e.name, 43) : n = limitStringLineWidth(e.url, 43),
                    $("#sidebar-request-" + e.id + " .request .request-name").html(n),
                    pm.request.collectionRequestId === e.id && ($("#request-name").html(e.name),
                    $("#request-description").html(e.description)),
                    $("#modal-edit-collection-request").modal("hide")
                })
            })
        }),
        $(window).resize(function() {
            pm.layout.setLayout()
        }),
        $("#response-data").on("click", ".cm-link", function() {
            var e = $(this).html()
              , t = $("#headers-keyvaleditor").keyvalueeditor("getValues");
            pm.request.loadRequestFromLink(e, t)
        }),
        $(".response-tabs").on("click", "li", function() {
            var e = $(this).attr("data-section");
            e === "body" ? pm.request.response.showBody() : e === "headers" ? pm.request.response.showHeaders() : e === "cookies" && pm.request.response.showCookies()
        }),
        $("#request-meta").on("mouseenter", function() {
            $(".request-meta-actions").css("display", "block")
        }),
        $("#request-meta").on("mouseleave", function() {
            $(".request-meta-actions").css("display", "none")
        }),
        this.setLayout()
    },
    attachSocialButtons: function() {
        var e = $("#about-postman-twitter-button").html();
        (e === "" || !e) && $("#about-postman-twitter-button").html(this.socialButtons.twitter),
        e = $("#about-postman-plus-one-button").html(),
        (e === "" || !e) && $("#about-postman-plus-one-button").html(this.socialButtons.plusOne),
        e = $("#about-postman-facebook-button").html(),
        (e === "" || !e) && $("#about-postman-facebook-button").html(this.socialButtons.facebook)
    },
    setLayout: function() {
        this.refreshScrollPanes()
    },
    refreshScrollPanes: function() {
        var e = $("#container").width() - $("#sidebar").width();
        $("#main").width(e + "px"),
        $("#sidebar").width() > 100 && $("#sidebar").jScrollPane({
            mouseWheelSpeed: 24
        })
    },
    sidebar: {
        currentSection: "history",
        isSidebarMaximized: !0,
        sections: ["history", "collections"],
        width: 0,
        animationDuration: 250,
        minimizeSidebar: function() {
            var e = pm.layout.sidebar.animationDuration;
            $("#sidebar-toggle").animate({
                left: "0"
            }, e),
            $("#sidebar").animate({
                width: "5px"
            }, e),
            $("#sidebar-footer").css("display", "none"),
            $("#sidebar div").animate({
                opacity: 0
            }, e);
            var t = $(document).width() - 5;
            $("#main").animate({
                width: t + "px",
                "margin-left": "5px"
            }, e),
            $("#sidebar-toggle img").attr("src", "img/tri_arrow_right.png")
        },
        maximizeSidebar: function() {
            var e = pm.layout.sidebar.animationDuration;
            $("#sidebar-toggle").animate({
                left: "350px"
            }, e, function() {
                $("#sidebar-footer").fadeIn()
            }),
            $("#sidebar").animate({
                width: pm.layout.sidebar.width + "px"
            }, e),
            $("#sidebar div").animate({
                opacity: 1
            }, e),
            $("#sidebar-toggle img").attr("src", "img/tri_arrow_left.png");
            var t = $(document).width() - pm.layout.sidebar.width;
            $("#main").animate({
                width: t + "px",
                "margin-left": pm.layout.sidebar.width + "px"
            }, e),
            pm.layout.refreshScrollPanes()
        },
        toggleSidebar: function() {
            var e = pm.layout.sidebar.isSidebarMaximized;
            e ? pm.layout.sidebar.minimizeSidebar() : pm.layout.sidebar.maximizeSidebar(),
            pm.layout.sidebar.isSidebarMaximized = !e
        },
        init: function() {
            $("#history-items").on("click", ".request-actions-delete", function() {
                var e = $(this).attr("data-request-id");
                pm.history.deleteRequest(e)
            }),
            $("#history-items").on("click", ".request", function() {
                var e = $(this).attr("data-request-id");
                pm.history.loadRequest(e)
            }),
            $("#sidebar-toggle").on("click", function() {
                pm.layout.sidebar.toggleSidebar()
            }),
            pm.layout.sidebar.width = $("#sidebar").width() + 10,
            this.addRequestListeners()
        },
        select: function(e) {
            return pm.collections.areLoaded === !1 && pm.collections.getAllCollections(),
            $("#sidebar-section-" + this.currentSection).css("display", "none"),
            $("#" + this.currentSection + "-options").css("display", "none"),
            this.currentSection = e,
            $("#sidebar-section-" + e).fadeIn(),
            $("#" + e + "-options").css("display", "block"),
            pm.layout.refreshScrollPanes(),
            !0
        },
        addRequest: function(e, t, n, r) {
            e.length > 80 && (e = e.substring(0, 80) + "..."),
            e = limitStringLineWidth(e, 40);
            var i = {
                url: e,
                method: t,
                id: n,
                position: r
            };
            r === "top" ? $("#history-items").prepend(Handlebars.templates.item_history_sidebar_request(i)) : $("#history-items").append(Handlebars.templates.item_history_sidebar_request(i)),
            $("#sidebar-section-history .empty-message").css("display", "none"),
            pm.layout.refreshScrollPanes()
        },
        addRequestListeners: function() {
            $("#sidebar-sections").on("mouseenter", ".sidebar-request", function() {
                var e = jQuery(".request-actions", this);
                e.css("display", "block")
            }),
            $("#sidebar-sections").on("mouseleave", ".sidebar-request", function() {
                var e = jQuery(".request-actions", this);
                e.css("display", "none")
            })
        },
        emptyCollectionInSidebar: function(e) {
            $("#collection-requests-" + e).html("")
        },
        removeRequestFromHistory: function(e, t) {
            t ? $("#sidebar-request-" + e).slideUp(100) : $("#sidebar-request-" + e).remove(),
            pm.history.requests.length === 0 ? pm.history.showEmptyMessage() : pm.history.hideEmptyMessage(),
            pm.layout.refreshScrollPanes()
        },
        removeCollection: function(e) {
            $("#collection-" + e).remove(),
            pm.layout.refreshScrollPanes()
        }
    }
},
pm.request = {
    url: "",
    urlParams: {},
    name: "",
    description: "",
    bodyParams: {},
    headers: [],
    method: "GET",
    dataMode: "params",
    isFromCollection: !1,
    collectionRequestId: "",
    methodsWithBody: ["POST", "PUT", "PATCH", "DELETE"],
    areListenersAdded: !1,
    startTime: 0,
    endTime: 0,
    xhr: null,
    body: {
        mode: "params",
        data: "",
        isEditorInitialized: !1,
        codeMirror: !1,
        init: function() {
            this.initFormDataEditor(),
            this.initUrlEncodedEditor(),
            this.initEditorListeners()
        },
        hide: function() {
            pm.request.body.closeFormDataEditor(),
            pm.request.body.closeUrlEncodedEditor(),
            $("#data").css("display", "none")
        },
        getRawData: function() {
            return pm.request.body.isEditorInitialized ? pm.request.body.codeMirror.getValue() : ""
        },
        loadRawData: function(e) {
            var t = pm.request.body;
            t.isEditorInitialized === !0 && (console.log("Blah__" + e + "____"),
            t.codeMirror.setValue(e),
            t.codeMirror.refresh())
        },
        initCodeMirrorEditor: function() {
            pm.request.body.isEditorInitialized = !0;
            var e = document.getElementById("body");
            pm.request.body.codeMirror = CodeMirror.fromTextArea(e, {
                mode: "htmlmixed",
                lineNumbers: !0,
                theme: "eclipse"
            }),
            $("#request .CodeMirror-scroll").css("height", "200px"),
            pm.request.body.codeMirror.refresh()
        },
        setEditorMode: function(e, t) {
            var n = $("#body-editor-mode-selector a[data-language='" + t + "']").html();
            $("#body-editor-mode-item-selected").html(n),
            pm.request.body.isEditorInitialized && (e === "javascript" ? pm.request.body.codeMirror.setOption("mode", {
                name: "javascript",
                json: !0
            }) : pm.request.body.codeMirror.setOption("mode", e),
            pm.request.body.codeMirror.refresh())
        },
        initFormDataEditor: function() {
            var e = "#formdata-keyvaleditor"
              , t = {
                placeHolderKey: "Key",
                placeHolderValue: "Value",
                valueTypes: ["text", "file"],
                deleteButton: '<img class="deleteButton" src="img/delete.png">',
                onDeleteRow: function() {},
                onBlurElement: function() {}
            };
            $(e).keyvalueeditor("init", t)
        },
        initUrlEncodedEditor: function() {
            var e = "#urlencoded-keyvaleditor"
              , t = {
                placeHolderKey: "Key",
                placeHolderValue: "Value",
                valueTypes: ["text"],
                deleteButton: '<img class="deleteButton" src="img/delete.png">',
                onDeleteRow: function() {},
                onBlurElement: function() {}
            };
            $(e).keyvalueeditor("init", t)
        },
        initEditorListeners: function() {
            $("#body-editor-mode-selector .dropdown-menu").on("click", "a", function(e) {
                var t = $(e.target).attr("data-editor-mode")
                  , n = $(e.target).attr("data-language");
                pm.request.body.setEditorMode(t, n)
            })
        },
        openFormDataEditor: function() {
            var e = "#formdata-keyvaleditor-container";
            $(e).css("display", "block");
            var t = "#formdata-keyvaleditor"
              , n = $(t).keyvalueeditor("getValues")
              , r = [];
            for (var i = 0; i < n.length; i++) {
                var s = {
                    key: n[i].key,
                    value: n[i].value
                };
                r.push(s)
            }
        },
        closeFormDataEditor: function() {
            var e = "#formdata-keyvaleditor-container";
            $(e).css("display", "none")
        },
        openUrlEncodedEditor: function() {
            var e = "#urlencoded-keyvaleditor-container";
            $(e).css("display", "block");
            var t = "#urlencoded-keyvaleditor"
              , n = $(t).keyvalueeditor("getValues")
              , r = [];
            for (var i = 0; i < n.length; i++) {
                var s = {
                    key: n[i].key,
                    value: n[i].value
                };
                r.push(s)
            }
        },
        closeUrlEncodedEditor: function() {
            var e = "#urlencoded-keyvaleditor-container";
            $(e).css("display", "none")
        },
        setDataMode: function(e) {
            pm.request.dataMode = e,
            pm.request.body.mode = e,
            $("#data-mode-selector a").removeClass("active"),
            $('#data-mode-selector a[data-mode="' + e + '"]').addClass("active"),
            $("#body-editor-mode-selector").css("display", "none"),
            e === "params" ? (pm.request.body.openFormDataEditor(),
            pm.request.body.closeUrlEncodedEditor(),
            $("#body-data-container").css("display", "none")) : e === "raw" ? (pm.request.body.closeUrlEncodedEditor(),
            pm.request.body.closeFormDataEditor(),
            $("#body-data-container").css("display", "block"),
            pm.request.body.isEditorInitialized === !1 ? pm.request.body.initCodeMirrorEditor() : pm.request.body.codeMirror.refresh(),
            $("#body-editor-mode-selector").css("display", "block")) : e === "urlencoded" && (pm.request.body.closeFormDataEditor(),
            pm.request.body.openUrlEncodedEditor(),
            $("#body-data-container").css("display", "none"))
        },
        getDataMode: function() {
            return pm.request.body.mode
        },
        getData: function() {
            var e, t = pm.request.body.mode, n, r, i, s;
            if (t === "params") {
                n = $("#formdata-keyvaleditor").keyvalueeditor("getValues"),
                r = [];
                for (s = 0; s < n.length; s++)
                    i = {
                        key: n[s].key,
                        value: n[s].value
                    },
                    r.push(i);
                e = pm.request.getBodyParamString(r)
            } else if (t === "raw")
                e = pm.request.body.getRawData();
            else if (t === "urlencoded") {
                n = $("#urlencoded-keyvaleditor").keyvalueeditor("getValues"),
                r = [];
                for (s = 0; s < n.length; s++)
                    i = {
                        key: n[s].key,
                        value: n[s].value
                    },
                    r.push(i);
                e = pm.request.getBodyParamString(r)
            }
            return e
        },
        loadData: function(e, t) {
            var n = pm.request.body;
            n.setDataMode(e),
            n.data = t;
            var r;
            e === "params" ? (r = getUrlVars(t, !1),
            $("#formdata-keyvaleditor").keyvalueeditor("reset", r)) : e === "raw" ? n.loadRawData(t) : e === "urlencoded" && (r = getUrlVars(t, !1),
            $("#urlencoded-keyvaleditor").keyvalueeditor("reset", r))
        }
    },
    init: function() {
        this.url = "",
        this.urlParams = {},
        this.body.data = "",
        this.bodyParams = {},
        this.headers = [],
        this.method = "GET",
        this.dataMode = "params",
        this.areListenersAdded || (this.areListenersAdded = !0,
        this.initializeHeaderEditor(),
        this.initializeUrlEditor(),
        this.body.init(),
        this.addListeners());
        var e = pm.settings.get("lastRequest");
        if (e !== "") {
            var t = JSON.parse(e);
            pm.request.isFromCollection = !1,
            pm.request.loadRequestInEditor(t)
        }
    },
    setHeaderValue: function(e, t) {
        var n = pm.request.headers
          , r = e;
        e = e.toLowerCase();
        var i = !1;
        for (var s = 0, o = n.length; s < o; s++) {
            var u = n[s].key.toLowerCase();
            u === e && t !== "text" && (n[s].value = t,
            i = !0)
        }
        var a = "#headers-keyvaleditor";
        if (!i && t !== "text") {
            var f = {
                key: r,
                value: t
            };
            n.push(f)
        }
        $(a).keyvalueeditor("reset", n)
    },
    getHeaderValue: function(e) {
        var t = pm.request.headers;
        e = e.toLowerCase();
        for (var n = 0, r = t.length; n < r; n++) {
            var i = t[n].key.toLowerCase();
            if (i === e)
                return t[n].value
        }
        return !1
    },
    getHeaderEditorParams: function() {
        var e = $("#headers-keyvaleditor").keyvalueeditor("getValues")
          , t = [];
        for (var n = 0; n < e.length; n++) {
            var r = {
                key: e[n].key,
                value: e[n].value,
                name: e[n].key
            };
            t.push(r)
        }
        return t
    },
    initializeHeaderEditor: function() {
        var e = {
            placeHolderKey: "Header",
            placeHolderValue: "Value",
            deleteButton: '<img class="deleteButton" src="img/delete.png">',
            onInit: function() {},
            onAddedParam: function() {
                $("#headers-keyvaleditor .keyvalueeditor-key").autocomplete({
                    source: chromeHeaders,
                    delay: 50
                })
            },
            onDeleteRow: function() {
                pm.request.headers = pm.request.getHeaderEditorParams(),
                $("#headers-keyvaleditor-actions-open .headers-count").html(pm.request.headers.length)
            },
            onFocusElement: function() {
                $("#headers-keyvaleditor .keyvalueeditor-key").autocomplete({
                    source: chromeHeaders,
                    delay: 50
                })
            },
            onBlurElement: function() {
                $("#headers-keyvaleditor .keyvalueeditor-key").autocomplete({
                    source: chromeHeaders,
                    delay: 50
                }),
                pm.request.headers = pm.request.getHeaderEditorParams(),
                $("#headers-keyvaleditor-actions-open .headers-count").html(pm.request.headers.length)
            },
            onReset: function() {
                var e = $("#headers-keyvaleditor").keyvalueeditor("getValues");
                $("#headers-keyvaleditor-actions-open .headers-count").html(e.length)
            }
        };
        $("#headers-keyvaleditor").keyvalueeditor("init", e),
        $("#headers-keyvaleditor-actions-close").on("click", function() {
            pm.request.closeHeaderEditor()
        }),
        $("#headers-keyvaleditor-actions-open").on("click", function() {
            pm.request.openHeaderEditor()
        })
    },
    getAsJson: function() {
        var e = {
            url: $("#url").val(),
            data: pm.request.body.getData(),
            headers: pm.request.getPackedHeaders(),
            dataMode: pm.request.dataMode,
            method: pm.request.method
        };
        return JSON.stringify(e)
    },
    saveCurrentRequestToLocalStorage: function() {
        pm.settings.set("lastRequest", pm.request.getAsJson())
    },
    openHeaderEditor: function() {
        var e = "#headers-keyvaleditor-container";
        $(e).css("display", "block")
    },
    closeHeaderEditor: function() {
        var e = "#headers-keyvaleditor-container";
        $(e).css("display", "none")
    },
    getUrlEditorParams: function() {
        var e = "#url-keyvaleditor"
          , t = $(e).keyvalueeditor("getValues")
          , n = [];
        for (var r = 0; r < t.length; r++) {
            var i = {
                key: t[r].key,
                value: t[r].value
            };
            n.push(i)
        }
        return n
    },
    initializeUrlEditor: function() {
        var e = "#url-keyvaleditor"
          , t = {
            placeHolderKey: "URL Parameter Key",
            placeHolderValue: "Value",
            deleteButton: '<img class="deleteButton" src="img/delete.png">',
            onDeleteRow: function() {
                pm.request.setUrlParamString(pm.request.getUrlEditorParams())
            },
            onBlurElement: function() {
                pm.request.setUrlParamString(pm.request.getUrlEditorParams())
            }
        };
        $(e).keyvalueeditor("init", t),
        $("#url-keyvaleditor-actions-close").on("click", function() {
            pm.request.closeUrlEditor()
        }),
        $("#url-keyvaleditor-actions-open").on("click", function() {
            var t = getUrlVars($("#url").val(), !1);
            $(e).keyvalueeditor("reset", t),
            pm.request.openUrlEditor()
        })
    },
    openUrlEditor: function() {
        var e = "#url-keyvaleditor-container";
        $(e).css("display", "block")
    },
    closeUrlEditor: function() {
        var e = "#url-keyvaleditor-container";
        $(e).css("display", "none")
    },
    addListeners: function() {
        $("#data-mode-selector").on("click", "a", function() {
            var e = $(this).attr("data-mode");
            pm.request.body.setDataMode(e)
        }),
        $(".request-meta-actions-togglesize").on("click", function() {
            var e = $(this).attr("data-action");
            e === "minimize" ? ($(this).attr("data-action", "maximize"),
            $(".request-meta-actions-togglesize img").attr("src", "img/circle_plus.png"),
            $("#request-description").slideUp(100)) : ($(".request-meta-actions-togglesize img").attr("src", "img/circle_minus.png"),
            $(this).attr("data-action", "minimize"),
            $("#request-description").slideDown(100))
        }),
        $("#url").keyup(function() {
            var e = getUrlVars($("#url").val(), !1);
            $("#url-keyvaleditor").keyvalueeditor("reset", e)
        })
    },
    getTotalTime: function() {
        return this.totalTime = this.endTime - this.startTime,
        this.totalTime
    },
    response: {
        status: "",
        responseCode: [],
        time: 0,
        headers: [],
        cookies: [],
        mime: "",
        text: "",
        state: {
            size: "normal"
        },
        previewType: "parsed",
        setMode: function(e) {
            var t = pm.request.response.text;
            pm.request.response.setFormat(e, t, pm.settings.get("previewType"), !0)
        },
        changePreviewType: function(e) {
            if (this.previewType === e)
                return;
            this.previewType = e,
            $("#response-formatting a").removeClass("active"),
            $('#response-formatting a[data-type="' + this.previewType + '"]').addClass("active"),
            pm.settings.set("previewType", e);
            if (e === "raw") {
                $("#response-as-text").css("display", "block"),
                $("#response-as-code").css("display", "none"),
                $("#response-as-preview").css("display", "none"),
                $("#code-data-raw").val(this.text);
                var t = $(document).width() - $("#sidebar").width() - 60;
                $("#code-data-raw").css("width", t + "px"),
                $("#code-data-raw").css("height", "600px"),
                $("#response-pretty-modifiers").css("display", "none")
            } else
                e === "parsed" ? ($("#response-as-text").css("display", "none"),
                $("#response-as-code").css("display", "inline-block"),
                $("#response-as-preview").css("display", "none"),
                $("#code-data").css("display", "none"),
                $("#response-pretty-modifiers").css("display", "block"),
                pm.editor.codeMirror.refresh()) : e === "preview" && ($("#response-as-text").css("display", "none"),
                $("#response-as-code").css("display", "none"),
                $("#code-data").css("display", "none"),
                $("#response-as-preview").css("display", "block"),
                $("#response-pretty-modifiers").css("display", "none"))
        },
        loadHeaders: function(e) {
            this.headers = pm.request.unpackResponseHeaders(e),
            $("#response-headers").html(""),
            this.headers = _.sortBy(this.headers, function(e) {
                return e.name
            }),
            $("#response-headers").append(Handlebars.templates.response_headers({
                items: this.headers
            })),
            $(".response-header-name").popover()
        },
        clear: function() {
            this.startTime = 0,
            this.endTime = 0,
            this.totalTime = 0,
            this.status = "",
            this.time = 0,
            this.headers = {},
            this.mime = "",
            this.state.size = "normal",
            this.previewType = "parsed",
            $("#response").css("display", "none")
        },
        showScreen: function(e) {
            $("#response").css("display", "block");
            var t = "#response-" + e + "-container"
              , n = ["#response-waiting-container", "#response-failed-container", "#response-success-container"];
            for (var r = 0; r < 3; r++)
                $(n[r]).css("display", "none");
            $(t).css("display", "block")
        },
        load: function(e) {
            if (e.readyState == 4) {
                if (e.status == 0) {
                    var t = pm.envManager.convertString(pm.request.url);
                    return $("#connection-error-url").html(t),
                    pm.request.response.showScreen("failed"),
                    $("#submit-request").button("reset"),
                    !1
                }
                pm.request.response.showScreen("success"),
                pm.request.response.showBody();
                var n = {
                    code: e.status,
                    name: httpStatusCodes[e.status].name,
                    detail: httpStatusCodes[e.status].detail
                }, r;
                e.responseType == "arraybuffer" ? r = e.response : this.text = e.responseText,
                pm.request.endTime = (new Date).getTime();
                var i = pm.request.getTotalTime();
                pm.request.response.time = i,
                pm.request.response.responseCode = n,
                $("#response-status").html(Handlebars.templates.item_response_code(n)),
                $(".response-code").popover(),
                this.loadHeaders(e.getAllResponseHeaders()),
                $('.response-tabs li[data-section="headers"]').html("Headers (" + this.headers.length + ")"),
                $("#response-data").css("display", "block"),
                $("#loader").css("display", "none"),
                $("#response-time .data").html(i + " ms");
                var s = e.getResponseHeader("Content-Type");
                $("#response").css("display", "block"),
                $("#submit-request").button("reset"),
                $("#code-data").css("display", "block");
                var o = "html";
                pm.request.response.previewType = pm.settings.get("previewType");
                var u = "html";
                if (!_.isUndefined(s) && !_.isNull(s)) {
                    if (s.search(/json/i) !== -1 || s.search(/javascript/i) !== -1)
                        o = "javascript";
                    $("#language").val(o);
                    if (s.search(/image/i) >= 0) {
                        u = "image",
                        $("#response-as-code").css("display", "none"),
                        $("#response-as-text").css("display", "none"),
                        $("#response-as-image").css("display", "block");
                        var a = $("#url").val();
                        $("#response-formatting").css("display", "none"),
                        $("#response-actions").css("display", "none"),
                        $("#response-language").css("display", "none"),
                        $("#response-as-preview").css("display", "none"),
                        $("#response-pretty-modifiers").css("display", "none"),
                        $("#response-as-image").html("<img src='" + a + "'/>")
                    } else if (s.search(/pdf/i) >= 0 && e.responseType == "arraybuffer")
                        u = "pdf",
                        $("#response-as-code").css("display", "none"),
                        $("#response-as-text").css("display", "none"),
                        $("#response-as-image").css("display", "none"),
                        $("#response-formatting").css("display", "none"),
                        $("#response-actions").css("display", "none"),
                        $("#response-language").css("display", "none"),
                        $("#response-as-preview").html(""),
                        $("#response-as-preview").css("display", "block"),
                        $("#response-pretty-modifiers").css("display", "none"),
                        pm.filesystem.renderResponsePreview("response.pdf", r, "pdf", function(e) {
                            $("#response-as-preview").html("<iframe src='" + e + "'/>")
                        });
                    else {
                        if (s.search(/pdf/i) >= 0 && e.responseType == "text") {
                            pm.request.send("arraybuffer");
                            return
                        }
                        u = "html",
                        this.setFormat(o, this.text, pm.settings.get("previewType"), !0)
                    }
                } else
                    this.setFormat(o, this.text, pm.settings.get("previewType"), !0);
                var f = pm.request.url;
                pm.request.response.loadCookies(f),
                u === "html" && ($("#response-as-preview").html(""),
                pm.filesystem.renderResponsePreview("response.html", pm.request.response.text, "html", function(e) {
                    $("#response-as-preview").html("<iframe></iframe>"),
                    $("#response-as-preview iframe").attr("src", e)
                })),
                pm.request.method === "HEAD" && pm.request.response.showHeaders(),
                pm.request.isFromCollection === !0 ? $("#response-collection-request-actions").css("display", "block") : $("#response-collection-request-actions").css("display", "none")
            }
            return pm.layout.setLayout(),
            !0
        },
        loadCookies: function(e) {
            chrome.cookies.getAll({
                url: e
            }, function(e) {
                var t;
                e ? t = e.length : t = 0;
                if (t == 0)
                    $("#response-tabs-cookies").html("Cookies"),
                    $("#response-tabs-cookies").css("display", "none");
                else {
                    $("#response-tabs-cookies").html("Cookies (" + t + ")"),
                    $("#response-tabs-cookies").css("display", "block"),
                    e = _.sortBy(e, function(e) {
                        return e.name
                    });
                    for (var n = 0; n < t; n++) {
                        var r = e[n];
                        if ("expirationDate"in r) {
                            var i = new Date(r.expirationDate * 1e3);
                            e[n].expires = i.toUTCString()
                        }
                    }
                    $("#response-cookies-items").html(Handlebars.templates.response_cookies({
                        items: e
                    }))
                }
                pm.request.response.cookies = e
            })
        },
        setFormat: function(e, t, n, r) {
            $("#response-as-code").css("display", "inline-block"),
            $("#response-as-text").css("display", "none"),
            $("#response-as-image").css("display", "none"),
            $("#response-formatting").css("display", "block"),
            $("#response-actions").css("display", "block"),
            $("#response-formatting a").removeClass("active"),
            $('#response-formatting a[data-type="' + n + '"]').addClass("active"),
            $("#code-data").css("display", "none"),
            $("#code-data").attr("data-mime", e);
            var i = document.getElementById("code-data"), s, o;
            $("#response-language").css("display", "block"),
            $("#response-language a").removeClass("active");
            if (e === "javascript") {
                try {
                    t = vkbeautify.json(t),
                    o = "javascript",
                    s = CodeMirror.newFoldFunction(CodeMirror.braceRangeFinder)
                } catch (u) {
                    o = "text"
                }
                $('#response-language a[data-mode="javascript"]').addClass("active")
            } else
                e === "html" ? (t = vkbeautify.xml(t),
                o = "xml",
                s = CodeMirror.newFoldFunction(CodeMirror.tagRangeFinder),
                $('#response-language a[data-mode="html"]').addClass("active")) : o = "text";
            var a;
            pm.settings.get("lineWrapping") === !0 ? ($("#response-body-line-wrapping").addClass("active"),
            a = !0) : ($("#response-body-line-wrapping").removeClass("active"),
            a = !1),
            pm.editor.mode = o;
            var f = o;
            $.inArray(o, ["javascript", "xml", "html"]) >= 0 && (f = "links");
            if (!pm.editor.codeMirror || r) {
                $("#response .CodeMirror").remove(),
                pm.editor.codeMirror = CodeMirror.fromTextArea(i, {
                    mode: f,
                    lineNumbers: !0,
                    fixedGutter: !0,
                    onGutterClick: s,
                    theme: "eclipse",
                    lineWrapping: a,
                    readOnly: !0
                });
                var l = pm.editor.codeMirror;
                l.setValue(t)
            } else
                pm.editor.codeMirror.setOption("onGutterClick", s),
                pm.editor.codeMirror.setOption("mode", f),
                pm.editor.codeMirror.setOption("lineWrapping", a),
                pm.editor.codeMirror.setOption("theme", "eclipse"),
                pm.editor.codeMirror.setOption("readOnly", !1),
                pm.editor.codeMirror.setValue(t),
                pm.editor.codeMirror.refresh(),
                CodeMirror.commands.goDocStart(pm.editor.codeMirror),
                $(window).scrollTop(0);
            if (n === "parsed")
                $("#response-as-code").css("display", "inline-block"),
                $("#response-as-text").css("display", "none"),
                $("#response-as-preview").css("display", "none"),
                $("#response-pretty-modifiers").css("display", "block");
            else if (n === "raw") {
                $("#code-data-raw").val(this.text);
                var c = $(document).width() - $("#sidebar").width() - 60;
                $("#code-data-raw").css("width", c + "px"),
                $("#code-data-raw").css("height", "600px"),
                $("#response-as-code").css("display", "none"),
                $("#response-as-text").css("display", "block"),
                $("#response-pretty-modifiers").css("display", "none")
            } else
                n === "preview" && ($("#response-as-code").css("display", "none"),
                $("#response-as-text").css("display", "none"),
                $("#response-as-preview").css("display", "block"),
                $("#response-pretty-modifiers").css("display", "none"))
        },
        toggleBodySize: function() {
            if ($("#response").css("display") === "none")
                return !1;
            $('a[rel="tooltip"]').tooltip("hide"),
            this.state.size === "normal" ? (this.state.size = "maximized",
            $("#response-body-toggle img").attr("src", "img/full-screen-exit-alt-2.png"),
            this.state.width = $("#response-data").width(),
            this.state.height = $("#response-data").height(),
            this.state.display = $("#response-data").css("display"),
            this.state.position = $("#response-data").css("position"),
            $("#response-data").css("position", "absolute"),
            $("#response-data").css("left", 0),
            $("#response-data").css("top", "-15px"),
            $("#response-data").css("width", $(document).width() - 20),
            $("#response-data").css("height", $(document).height()),
            $("#response-data").css("z-index", 100),
            $("#response-data").css("background-color", "#fff"),
            $("#response-data").css("padding", "10px")) : (this.state.size = "normal",
            $("#response-body-toggle img").attr("src", "img/full-screen-alt-4.png"),
            $("#response-data").css("position", this.state.position),
            $("#response-data").css("left", 0),
            $("#response-data").css("top", 0),
            $("#response-data").css("width", this.state.width),
            $("#response-data").css("height", this.state.height),
            $("#response-data").css("z-index", 10),
            $("#response-data").css("background-color", "#fff"),
            $("#response-data").css("padding", "0px"))
        },
        showHeaders: function() {
            $(".response-tabs li").removeClass("active"),
            $('.response-tabs li[data-section="headers"]').addClass("active"),
            $("#response-data-container").css("display", "none"),
            $("#response-headers-container").css("display", "block"),
            $("#response-cookies-container").css("display", "none")
        },
        showBody: function() {
            $(".response-tabs li").removeClass("active"),
            $('.response-tabs li[data-section="body"]').addClass("active"),
            $("#response-data-container").css("display", "block"),
            $("#response-headers-container").css("display", "none"),
            $("#response-cookies-container").css("display", "none")
        },
        showCookies: function() {
            $(".response-tabs li").removeClass("active"),
            $('.response-tabs li[data-section="cookies"]').addClass("active"),
            $("#response-data-container").css("display", "none"),
            $("#response-headers-container").css("display", "none"),
            $("#response-cookies-container").css("display", "block")
        },
        openInNewWindow: function(e) {
            var t = "response.html"
              , n = "text/html";
            pm.filesystem.saveAndOpenFile(t, e, n, function() {})
        }
    },
    startNew: function() {
        pm.request.xhr !== null && pm.request.xhr.abort(),
        this.url = "",
        this.urlParams = {},
        this.body.data = "",
        this.bodyParams = {},
        this.name = "",
        this.description = "",
        this.headers = [],
        this.method = "GET",
        this.dataMode = "params",
        this.refreshLayout(),
        $("#url-keyvaleditor").keyvalueeditor("reset"),
        $("#headers-keyvaleditor").keyvalueeditor("reset"),
        $("#formdata-keyvaleditor").keyvalueeditor("reset"),
        $("#update-request-in-collection").css("display", "none"),
        $("#url").val(),
        $("#url").focus(),
        this.response.clear()
    },
    cancel: function() {
        pm.request.xhr !== null && pm.request.xhr.abort(),
        pm.request.response.clear()
    },
    setMethod: function(e) {
        this.url = $("#url").val(),
        this.method = e,
        this.refreshLayout()
    },
    refreshLayout: function() {
        $("#url").val(this.url),
        $("#request-method-selector").val(this.method),
        pm.request.body.loadRawData(pm.request.body.getData()),
        $("#headers-keyvaleditor").keyvalueeditor("reset", this.headers),
        $("#headers-keyvaleditor-actions-open .headers-count").html(this.headers.length),
        $("#submit-request").button("reset"),
        $("#data-mode-selector a").removeClass("active"),
        $('#data-mode-selector a[data-mode="' + this.dataMode + '"]').addClass("active");
        if (this.isMethodWithBody(this.method)) {
            $("#data").css("display", "block");
            var e = this.dataMode;
            pm.request.body.setDataMode(e)
        } else
            pm.request.body.hide();
        this.name !== "" ? ($("#request-meta").css("display", "block"),
        $("#request-name").css("display", "inline-block"),
        $("#request-description").css("display") === "block" ? $("#request-description").css("display", "block") : $("#request-description").css("display", "none")) : ($("#request-meta").css("display", "none"),
        $("#request-name").css("display", "none"),
        $("#request-description").css("display", "none")),
        $(".request-help-actions-togglesize a").attr("data-action", "minimize"),
        $(".request-help-actions-togglesize img").attr("src", "img/circle_minus.png")
    },
    loadRequestFromLink: function(e, t) {
        this.startNew(),
        this.url = e,
        this.method = "GET",
        pm.request.isFromCollection = !1,
        pm.settings.get("retainLinkHeaders") === !0 && t && (pm.request.headers = t),
        this.refreshLayout()
    },
    isMethodWithBody: function(e) {
        return e = e.toUpperCase(),
        $.inArray(e, pm.request.methodsWithBody) >= 0
    },
    packHeaders: function(e) {
        var t = e.length
          , n = "";
        for (var r = 0; r < t; r++) {
            var i = e[r];
            i.name && i.name !== "" && (n += i.name + ": " + i.value + "\n")
        }
        return n
    },
    getPackedHeaders: function() {
        return this.packHeaders(this.headers)
    },
    unpackResponseHeaders: function(e) {
        if (e === null || e === "")
            return [];
        var t = [], n, r = e.split("\n"), i;
        for (var s = 0; s < r.length; s++) {
            n = r[s];
            var o = n.search(":");
            if (o !== -1) {
                var u = $.trim(n.substr(0, o))
                  , a = $.trim(n.substr(o + 1));
                i = {
                    name: u,
                    key: u,
                    value: a,
                    description: headerDetails[u.toLowerCase()]
                },
                t.push(i)
            }
        }
        return t
    },
    unpackHeaders: function(e) {
        if (e === null || e === "")
            return [];
        var t = [], n, r = e.split("\n"), i;
        for (var s = 0; s < r.length; s++) {
            n = r[s];
            if (!n)
                continue;
            var o = n.search(":");
            if (o !== -1) {
                var u = $.trim(n.substr(0, o))
                  , a = $.trim(n.substr(o + 1));
                i = {
                    name: $.trim(u),
                    key: $.trim(u),
                    value: $.trim(a),
                    description: headerDetails[$.trim(u).toLowerCase()]
                },
                t.push(i)
            }
        }
        return t
    },
    loadRequestInEditor: function(e, t) {
        pm.helpers.showRequestHelper("normal"),
        this.url = e.url,
        this.body.data = e.body,
        this.method = e.method.toUpperCase(),
        t ? $("#update-request-in-collection").css("display", "inline-block") : $("#update-request-in-collection").css("display", "none"),
        typeof e.headers != "undefined" ? this.headers = this.unpackHeaders(e.headers) : this.headers = [],
        typeof e.name != "undefined" ? (this.name = e.name,
        $("#request-meta").css("display", "block"),
        $("#request-name").html(this.name),
        $("#request-name").css("display", "inline-block")) : (this.name = "",
        $("#request-meta").css("display", "none"),
        $("#request-name").css("display", "none")),
        typeof e.description != "undefined" ? (this.description = e.description,
        $("#request-description").html(this.description),
        $("#request-description").css("display", "block")) : (this.description = "",
        $("#request-description").css("display", "none")),
        $(".request-meta-actions-togglesize").attr("data-action", "minimize"),
        $(".request-meta-actions-togglesize img").attr("src", "img/circle_minus.png"),
        $("#headers-keyvaleditor-actions-open .headers-count").html(this.headers.length),
        $("#url").val(this.url);
        var n = getUrlVars(this.url, !1);
        $("#url-keyvaleditor").keyvalueeditor("reset", n),
        $("#headers-keyvaleditor").keyvalueeditor("reset", this.headers),
        this.response.clear(),
        $("#request-method-selector").val(this.method),
        this.isMethodWithBody(this.method) ? (this.dataMode = e.dataMode,
        $("#data").css("display", "block"),
        pm.request.body.loadData(e.dataMode, e.data)) : $("#data").css("display", "none");
        var r = pm.request.getHeaderValue("Content-Type"), i, s;
        r === !1 ? (i = "text",
        s = "text") : r.search(/json/i) !== -1 || r.search(/javascript/i) !== -1 ? (i = "javascript",
        s = "json") : r.search(/xml/i) !== -1 ? (i = "xml",
        s = "xml") : r.search(/html/i) !== -1 ? (i = "xml",
        s = "html") : (s = "text",
        r = "text"),
        pm.request.body.setEditorMode(i, s),
        $("body").scrollTop(0)
    },
    getBodyParamString: function(e) {
        var t = e.length
          , n = [];
        for (var r = 0; r < t; r++) {
            var i = e[r];
            i.key && i.key !== "" && n.push(i.key + "=" + i.value)
        }
        return n.join("&")
    },
    setUrlParamString: function(e) {
        this.url = $("#url").val();
        var t = this.url
          , n = [];
        for (var r = 0; r < e.length; r++) {
            var i = e[r];
            i.key && i.key !== "" && n.push(i.key + "=" + i.value)
        }
        var s = t.split("?")[0];
        n.length > 0 ? $("#url").val(s + "?" + n.join("&")) : t.indexOf("?") > 0 && t.indexOf("=") > 0 ? $("#url").val(s) : $("#url").val(t)
    },
    reset: function() {},
    encodeUrl: function(e) {
        var t = e.indexOf("?");
        if (t > 0) {
            var n = getUrlVars(e)
              , r = e.substring(0, t)
              , i = n.length
              , s = r + "?";
            for (var o = 0; o < i; o++)
                s += encodeURIComponent(n[o].key) + "=" + encodeURIComponent(n[o].value) + "&";
            return s = s.substr(0, s.length - 1),
            e
        }
        return e
    },
    prepareHeadersForProxy: function(e) {
        var t = e.length;
        for (var n = 0; n < t; n++) {
            var r = e[n].key.toLowerCase();
            _.indexOf(pm.bannedHeaders, r) >= 0 && (e[n].key = "Postman-" + e[n].key,
            e[n].name = "Postman-" + e[n].name)
        }
        return e
    },
    send: function(e) {
        pm.request.setUrlParamString(pm.request.getUrlEditorParams()),
        pm.request.headers = pm.request.getHeaderEditorParams(),
        $("#headers-keyvaleditor-actions-open .headers-count").html(pm.request.headers.length);
        var t;
        this.url = $("#url").val();
        var n = this.url;
        this.body.data = pm.request.body.getData();
        if (n === "")
            return;
        var r = new XMLHttpRequest;
        pm.request.xhr = r;
        var i = pm.envManager
          , s = i.selectedEnv
          , o = [];
        s !== null && (o = s.values),
        n = i.processString(n, o),
        n = ensureProperUrl(n),
        pm.request.url = n,
        n = pm.request.encodeUrl(n);
        var u = $("#url").val(), a = this.method.toUpperCase(), f = pm.request.body.getRawData(), l = f, c, h = this.headers;
        pm.settings.get("usePostmanProxy") == 1 && (h = pm.request.prepareHeadersForProxy(h)),
        pm.request.startTime = (new Date).getTime(),
        r.onreadystatechange = function(e) {
            pm.request.response.load(e.target)
        }
        ,
        e || (e = "text"),
        r.responseType = e,
        r.open(a, n, !0);
        for (t = 0; t < h.length; t++) {
            var p = h[t];
            _.isEmpty(p.value) || r.setRequestHeader(p.name, i.processString(p.value, o))
        }
        var d, v, m, g, y, b;
        if (this.isMethodWithBody(a)) {
            if (this.dataMode === "raw")
                f = i.processString(f, o),
                c = f,
                r.send(c);
            else if (this.dataMode === "params") {
                c = new FormData,
                d = $("#formdata-keyvaleditor").keyvalueeditor("getElements"),
                v = d.length;
                for (m = 0; m < v; m++) {
                    g = d[m],
                    y = g.keyElement.val();
                    var w = g.valueType
                      , E = g.valueElement;
                    if (w === "file") {
                        var S = E.get(0)
                          , x = S.files.length;
                        for (t = 0; t < x; t++)
                            c.append(y, S.files[t])
                    } else
                        b = E.val(),
                        b = i.processString(b, o),
                        c.append(y, b)
                }
                v > 0 ? r.send(c) : r.send()
            } else if (this.dataMode === "urlencoded") {
                c = "",
                d = $("#urlencoded-keyvaleditor").keyvalueeditor("getElements"),
                r.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"),
                v = d.length;
                for (m = 0; m < v; m++)
                    g = d[m],
                    b = g.valueElement.val(),
                    b = i.processString(b, o),
                    b = encodeURIComponent(b),
                    b = b.replace(/%20/g, "+"),
                    y = encodeURIComponent(g.keyElement.val()),
                    y = y.replace(/%20/g, "+"),
                    c += y + "=" + b + "&";
                c = c.substr(0, c.length - 1),
                v > 0 ? r.send(c) : r.send()
            }
        } else
            r.send();
        pm.settings.get("autoSaveRequest") && pm.history.addRequest(u, a, pm.request.getPackedHeaders(), l, this.dataMode),
        $("#submit-request").button("loading"),
        pm.request.response.clear(),
        pm.request.response.showScreen("waiting")
    }
},
pm.settings = {
    historyCount: 50,
    lastRequest: "",
    autoSaveRequest: !0,
    selectedEnvironmentId: "",
    init: function() {
        pm.settings.create("historyCount", 100),
        pm.settings.create("autoSaveRequest", !0),
        pm.settings.create("selectedEnvironmentId", !0),
        pm.settings.create("lineWrapping", !0),
        pm.settings.create("previewType", "parsed"),
        pm.settings.create("retainLinkHeaders", !1),
        pm.settings.create("usePostmanProxy", !1),
        pm.settings.create("proxyURL", ""),
        pm.settings.create("lastRequest", ""),
        pm.settings.create("variableDelimiter", "{{...}}"),
        $("#history-count").val(pm.settings.get("historyCount")),
        $("#auto-save-request").val(pm.settings.get("autoSaveRequest") + ""),
        $("#retain-link-headers").val(pm.settings.get("retainLinkHeaders") + ""),
        $("#use-postman-proxy").val(pm.settings.get("usePostmanProxy") + ""),
        $("#postman-proxy-url").val(pm.settings.get("postmanProxyUrl")),
        $("#variable-delimiter").val(pm.settings.get("variableDelimiter")),
        $("#history-count").change(function() {
            pm.settings.set("historyCount", $("#history-count").val())
        }),
        $("#auto-save-request").change(function() {
            var e = $("#auto-save-request").val();
            e == "true" ? pm.settings.set("autoSaveRequest", !0) : pm.settings.set("autoSaveRequest", !1)
        }),
        $("#retain-link-headers").change(function() {
            var e = $("#retain-link-headers").val();
            e === "true" ? pm.settings.set("retainLinkHeaders", !0) : pm.settings.set("retainLinkHeaders", !1)
        }),
        $("#use-postman-proxy").change(function() {
            var e = $("#use-postman-proxy").val();
            e == "true" ? (pm.settings.set("usePostmanProxy", !0),
            $("#postman-proxy-url-container").css("display", "block")) : (pm.settings.set("usePostmanProxy", !1),
            $("#postman-proxy-url-container").css("display", "none"))
        }),
        $("#postman-proxy-url").change(function() {
            pm.settings.set("postmanProxyUrl", $("#postman-proxy-url").val())
        }),
        $("#variable-delimiter").change(function() {
            pm.settings.set("variableDelimiter", $("#variable-delimiter").val())
        }),
        pm.settings.get("usePostmanProxy") == 1 ? $("#postman-proxy-url-container").css("display", "block") : $("#postman-proxy-url-container").css("display", "none")
    },
    create: function(e, t) {
        localStorage[e] ? pm.settings[e] = localStorage[e] : t !== "undefined" && (pm.settings[e] = t,
        localStorage[e] = t)
    },
    set: function(e, t) {
        pm.settings[e] = t,
        localStorage[e] = t
    },
    get: function(e) {
        var t = localStorage[e];
        return t === "true" ? !0 : t === "false" ? !1 : localStorage[e]
    }
},
pm.urlCache = {
    urls: [],
    addUrl: function(e) {
        $.inArray(e, this.urls) == -1 && (pm.urlCache.urls.push(e),
        this.refreshAutoComplete())
    },
    refreshAutoComplete: function() {
        $("#url").autocomplete({
            source: pm.urlCache.urls,
            delay: 50
        })
    }
};
