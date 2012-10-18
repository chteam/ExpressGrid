/// <reference path="_gridHistory.js" />

/*
1.0.12.70310
createGrid:30ms addData:45ms/ 50 line

process : 110ms / 50 line
*/
(function ($) {
    var documemtLoadCompleted = false;
    $(document).ready(function () { documemtLoadCompleted = true; });

    var isNewBrowser = String.prototype.trim;
    function stringBuilder() {
        this.content = isNewBrowser ? "" : [];
    }

    (function () {
        stringBuilder.prototype.append = isNewBrowser ?
            function (str) {
                this.content += str;
                return this;
            } : function (str) {
                this.content.push(str);
                return this;
            };
        stringBuilder.prototype.appends = isNewBrowser ? function () {
            for (var i = 0, l = arguments.length; i < l; i++) {
                this.content += arguments[i];
            }
            return this;
        } : function () {
            for (var i = 0, l = arguments.length; i < l; i++) {
                this.content.push(arguments[i]);
            }
            return this;
        };
        stringBuilder.prototype.toString = isNewBrowser ? function () {
            return this.content;
        } : function () {
            return this.content.join("");
        };
        stringBuilder.prototype.clear = isNewBrowser ? function () {
            this.content = "";
            return this;
        } : function () {
            this.content = [];
            return this;
        };
    })("StringBuilder");


    $.fn.getGCode = function (dict, key, colorDict) {
        var text = "";
        if (dict[key]) text = dict[key];
        if (colorDict && colorDict[key]) {
            text = "<span style='color:" + colorDict[key] + "'>" + text + "</span>";
        }
        return text;
    };
    $.fn.pager = function (p, handler) {
        var page = $(this);
        if (page.length == 0) return;
        p.pages = Math.ceil(p.total / p.rp);
        page.html(p.page + "/" + p.pages);
        var breakspan = '<span class="break">...</span>';
        var getPage = function (pg, t) {
            return $("<a></a>").attr('href', 'javascript:;').click(function () {
                handler(pg);
            }).text(t);
        };
        if (p.page > 1) {
            if (p.page - 2 > 1) {
                page.append(getPage(1, '< <')).append(breakspan);
            }
            page.append(getPage(p.page - 1, "< \u4e0a\u4e00\u9875"));
        }
        for (var i = 2; i <= 6; i++) {
            if ((p.page + i - 4) >= 1 && (p.page + i - 4) <= p.pages) {
                if (4 == i) {
                    page.append($('<span class="this-page"></span>').text(p.page));
                } else {
                    page.append(getPage(p.page + i - 4, p.page + i - 4));
                }
            }
        }
        if (p.page < p.pages) {
            page.append(getPage(1 + p.page, "\u4e0b\u4e00\u9875 >"));
            if (p.page + 2 < p.pages) {
                page.append(breakspan).append(getPage(p.pages, "> >"));
            }
        }
    };

    $.createGrid = function (t, p) {
        if (t.grid) return false; //return if already exist	
        p = $.extend({
            striped: true,
            //apply odd even stripes
            minwidth: 30,
            //min width of columns
            minheight: 80,
            //min height of columns
            url: false,
            //ajax url
            method: 'POST',
            // data sending method
            errormsg: '\u8fde\u63a5\u9519\u8bef',
            nowrap: true,
            //
            page: 1,
            //current page
            total: 1,
            //total pages
            rp: 20,
            // results per page
            pagestat: '\u5f53\u524d\u4e3a {from} - {to} \u6761 \u5171 {total} \u6761',
            procmsg: '\u8f7d\u5165\u4e2d\uff0c\u8bf7\u7a0d\u5019...',
            nomsg: '\u5f53\u524d\u65e0\u8bb0\u5f55',
            minColToggle: 1,
            hideOnSubmit: true,
            blockOpacity: 0.5,
            colresize: true,
            colMove: false,
            conditionSelector: "#filterData",
            isIE7: ($.browser.msie && $.browser.version <= 7.0),
            isIE6: ($.browser.msie && $.browser.version < 7.0)
        }, p);
        //
        var tDom = $(t).addClass("original");

        //create grid class
        var g =
        {
            makeHistoryInfo: function () {
                //history
                if ($.fn.historyStore && !$.fn.historyStore.loadFromCache) {
                    $.fn.historyStore.setInfo(p.newp, p.sortname, p.sortorder);
                }
            },
            widthFix: function () {
                if (p.height == 'auto') {
                    var bDom = $(g.bDiv);
                    var bWidth = bDom.width();
                    var tWidth = $('table', g.bDiv).width();
                    if (bWidth < tWidth || p.isIE7) {
                        bDom.css({ 'padding-bottom': 15 });
                    } else {
                        bDom.css({ 'padding-bottom': 0 });
                    }
                }
            },
            heightFix: function () {
                if (p._ie9FixTimeout) clearTimeout(p._ie9FixTimeout);
                var tThis = this;
                p._ie9FixTimeout = setTimeout(function () {
                    tThis.ie9Fix();
                }, 61);
            },
            ie9Fix: function () {
                var bDom = $(g.bDiv);
                var bHeight = bDom.height();
                var tHeight = $("table", g.bDiv).height();
                var fixOffset = 0;
                if (bHeight != tHeight && p.height == 'auto') {
                    bDom.css({ height: tHeight + fixOffset });
                }
                //ie9 b-u-g fix with nber
                //http://stackoverflow.com/questions/5819456/expressGrid-ie9-heightauto
            },
            hset: {},
            rePosDrag: function () {
                if (!p._thDivPaddingLR)
                    p._thDivPaddingLR = $('.expressGrid div.hDiv th div').css("padding-left").replace('px', '') * 2;
                $(g.cDrag).css({ top: p.title ? 30 : 1 });
                var hDivLeft = p._scrollLeft >> 0;
                var initLeft = 0;
                var dragDivs = $('div', g.cDrag);
                var cgi = 0;
                for (var coli1 = 0, colLen1 = p.colModel.length; coli1 < colLen1; coli1++) {
                    var c1 = p.colModel[coli1];
                    if (!c1.hide) {
                        var w = c1.width;
                        if (p._isTableFullWidth) {
                            w = $('th:eq(' + coli1 + ')', this.hDiv).width() - 10;
                        }
                        initLeft += w + p._thDivPaddingLR + 1;
                        $(dragDivs[cgi]).css({ 'left': initLeft - hDivLeft + 'px' });
                        cgi++;
                    }
                }
            },
            fixHeight: function (newH) {
                newH = false;
                if (!newH)
                    newH = $(g.bDiv).height();
                var hdHeight = $(this.hDiv).height();
                var tDivHeight = p.title ? $(g.tDiv).height() : 0;
                $('div', this.cDrag).each(function () {
                    var h = newH + hdHeight;
                    $(this).height((h > 0 ? h : 25) + tDivHeight);
                });
                $(g.block).css({ height: newH, marginBottom: (newH * -1) });

                var hrH = g.bDiv.offsetTop + newH;
                if (p.height != 'auto' && p.resizable)
                    hrH = g.vDiv.offsetTop;
                $(g.rDiv).css({ height: hrH });

            },
            dragStart: function (dragtype, e, obj) {
                //default drag function start
                if (dragtype == 'colresize' && p.colresize)//column resize
                {
                    var n = $('div', this.cDrag).index(obj);
                    var ow = $('th:visible div:eq(' + n + ')', this.hDiv).width();
                    $(obj).addClass('dragging').siblings().hide();
                    $(obj).prev().addClass('dragging').show();
                    this.colresize =
                        {
                            startX: e.pageX, ol: parseInt(obj.style.left),
                            ow: ow,
                            n: n
                        };
                    $('body').css('cursor', 'col-resize');
                }
                else if (dragtype == 'vresize')//table resize
                {
                    var hgo = false;
                    $('body').css('cursor', 'row-resize');
                    if (obj) {
                        hgo = true;
                        $('body').css('cursor', 'col-resize');
                    }
                    this.vresize =
                        {
                            h: p.height, sy: e.pageY,
                            w: p.width,
                            sx: e.pageX,
                            hgo: hgo
                        };
                }
                else if (dragtype == 'colMove' && p.colMove) {
                        //column header drag
                    this.hset = $(this.hDiv).offset();
                    this.hset.right = this.hset.left + $('table', this.hDiv).width();
                    this.hset.bottom = this.hset.top + $('table', this.hDiv).height();
                    this.dcol = obj;
                    this.dcoln = $('th', this.hDiv).index(obj);

                    this.colCopy = document.createElement("div");
                    this.colCopy.className = "colCopy";
                    this.colCopy.innerHTML = obj.innerHTML;
                    if ($.browser.msie) {
                        this.colCopy.className = "colCopy ie";
                    }
                    $(this.colCopy).css({
                        position: 'absolute',
                        'float': 'left',
                        display: 'none',
                        textAlign: obj.align
                    });
                    $('body').append(this.colCopy);
                    $(this.cDrag).hide();
                }
                $('body').noSelect();
            },
            dragMove: function (e) {

                var diff;
                if (this.colresize)//column resize
                {
                    var n = this.colresize.n;
                    diff = e.pageX - this.colresize.startX;
                    var nleft = this.colresize.ol + diff;
                    var nw = this.colresize.ow + diff;
                    if (nw > p.minwidth) {
                        $('div:eq(' + n + ')', this.cDrag).css('left', nleft);
                        this.colresize.nw = nw;
                    }
                }
                else if (this.vresize) {
                        //table resize
                    var v = this.vresize;
                    var y = e.pageY;
                    diff = y - v.sy;
                    if (!p.defwidth)
                        p.defwidth = p.width;

                    if (p.width != 'auto' && !p.nohresize && v.hgo) {
                        var x = e.pageX;
                        var xdiff = x - v.sx;
                        var newW = v.w + xdiff;
                        if (newW > p.defwidth) {
                            this.gDiv.style.width = newW + 'px';
                            p.width = newW;
                        }
                    }

                    var newH = v.h + diff;
                    if ((newH > p.minheight || p.height < p.minheight) && !v.hgo) {
                        this.bDiv.style.height = newH + 'px';
                        p.height = newH;
                        this.fixHeight(newH);
                    }
                }
                else if (this.colCopy) {
                    $(this.dcol).addClass('thMove').removeClass('thOver');
                    if (e.pageX > this.hset.right || e.pageX < this.hset.left || e.pageY > this.hset.bottom || e.pageY < this.hset.top) {
                        //this.dragEnd();
                        $('body').css('cursor', 'move');
                    }
                    else
                        $('body').css('cursor', 'pointer');
                    $(this.colCopy).css({
                        top: e.pageY + 10,
                        left: e.pageX + 20,
                        display: 'block'
                    });
                }

            },
            dragEnd: function () {

                if (this.colresize) {
                    //优化前 45ms 优化后15ms
                    var n = this.colresize.n;
                    var nw = this.colresize.nw;
                    $('th:visible div:eq(' + n + ')', this.hDiv).css('width', nw);
                    $('.b-col-' + n, this.bDiv).css('width', nw);
                    if (p._scrollLeft)
                        this.syncScrollLeft();

                    $('div:eq(' + n + ')', this.cDrag).siblings().show();

                    $('.dragging', this.cDrag).removeClass('dragging');

                    var coli2 = 0;
                    for (var coli = 0, coliLen = p.colModel.length; coli < coliLen; coli++) {
                        if (!p.colModel[coli].hide) {
                            if (coli2 == n) {
                                p.colModel[coli].width = nw;
                                break;
                            }
                            coli2++;
                        }
                    }
                    this.rePosDrag();
                    this.fixHeight();
                    this.widthFix();
                    this.colresize = false;
                }
                else if (this.vresize) {
                    this.vresize = false;
                }
                else if (this.colCopy) {
                    $(this.colCopy).remove();
                    if (this.dcolt != null) {
                        if (this.dcoln > this.dcolt)
                            $('th:eq(' + this.dcolt + ')', this.hDiv).before(this.dcol);
                        else
                            $('th:eq(' + this.dcolt + ')', this.hDiv).after(this.dcol);
                        this.switchCol(this.dcoln, this.dcolt);
                        $(this.cdropleft).remove();
                        $(this.cdropright).remove();
                        this.rePosDrag();
                        if (p.onDragCol)
                            p.onDragCol(this.dcoln, this.dcolt);
                    }
                    this.dcol = null;
                    this.hset = null;
                    this.dcoln = null;
                    this.dcolt = null;
                    this.colCopy = null;

                    $('.thMove', this.hDiv).removeClass('thMove');
                    $(this.cDrag).show();
                }

                $('body').css('cursor', 'default');
                $('body').noSelect(false);
                g.heightFix();
            },
            toggleCol: function (cid, visible) {

                var ncol = $("th[axis='col" + cid + "']", this.hDiv)[0];
                var n = $('thead th', g.hDiv).index(ncol);
                var cb = $('input[value=' + cid + ']', g.nDiv)[0];

                if (visible == null) {
                    visible = ncol.hide;
                }

                if ($('input:checked', g.nDiv).length < p.minColToggle && !visible)
                    return false;

                if (visible) {
                    ncol.hide = false;
                    $(ncol).show();
                    cb.checked = true;
                }
                else {
                    ncol.hide = true;
                    $(ncol).hide();
                    cb.checked = false;
                }

                this.rePosDrag();

                if (p.onToggleCol)
                    p.onToggleCol(cid, visible);

                return visible;
            },
            switchCol: function (cdrag, cdrop) {
                //switch columns
                $('tbody tr', g.bDiv).each(function () {
                    if (cdrag > cdrop)
                        $('td:eq(' + cdrop + ')', this).before($('td:eq(' + cdrag + ')', this));
                    else
                        $('td:eq(' + cdrop + ')', this).after($('td:eq(' + cdrag + ')', this));
                });
                //switch order in nDiv
                if (cdrag > cdrop)
                    $('tr:eq(' + cdrop + ')', this.nDiv).before($('tr:eq(' + cdrag + ')', this.nDiv));
                else
                    $('tr:eq(' + cdrop + ')', this.nDiv).after($('tr:eq(' + cdrag + ')', this.nDiv));
                if (p.isIE6)
                    $('tr:eq(' + cdrop + ') input', this.nDiv)[0].checked = true;

                if (p._scrollLeft)
                    this.syncScrollLeft();
            },
            syncScrollLeft: function () {

                p._scrollLeft = this.bDiv.scrollLeft;
                this.hDiv.scrollLeft = p._scrollLeft;

            },
            scroll: function () {

                this.syncScrollLeft();
                this.rePosDrag();
                // todo: reset hdiv's 
            },
            getLower: function (str) {
                if (!p._lowerDict) p._lowerDict = {};
                if (!p._lowerDict[str]) p._lowerDict[str] = str.toLowerCase();
                return p._lowerDict[str];
            },
            addData: function (data) {
                p.rows = {};
                //parse data
                if (p.preProcess)
                    data = p.preProcess(data);
                $('.pReload', this.pDiv).removeClass('loading');
                this.loading = false;
                if (!data) {
                    $('.pPageStat', this.pDiv).html(p.errormsg);
                    return false;
                }
                //处理页面
                p.total = data.Total;
                if (p.total == 0) {
                    $('tr, a, td, div', g.bDiv).unbind();
                    g.bDiv.innerHTML = "";
                    p.pages = 1;
                    p.page = 1;
                    this.buildpager(data);
                    $('.pPageStat', this.pDiv).html(p.nomsg);
                    return false;
                }
                p.pages = Math.ceil(p.total / p.rp);
                p.page = data.Page;
                this.buildpager(data);

                var stack = new stringBuilder();

                stack.appends('<table cellpadding="0" cellspacing="0" border="0">');
                stack.append('<tbody>');
                for (var rowi = 0, rowLen = data.Rows.length; rowi < rowLen; rowi++) {
                    var row = data.Rows[rowi];
                    //^build tr begin
                    var trClass = "";
                    if ((rowi & 1) && p.striped) {
                        trClass = ' class="erow"';
                    }
                    var entity = {};
                    if (row.Id) {
                        for (var j = 0, len = data.Keys.length; j < len; j++) {
                            if (rowi == 0) {
                                entity[this.getLower(data.Keys[j])] = row.Cell[j];
                            } else {
                                entity[p._lowerDict[data.Keys[j]]] = row.Cell[j];
                            }
                        }
                        p.rows[row.Id] = entity;
                    }
                    stack.appends('<tr', trClass, ' id="row', row.Id, '">');
                    //add cell
                    var vIndex = 0;
                    for (var coli = 0, colLen = p.colModel.length; coli < colLen; coli++) {
                        var col = p.colModel[coli];
                        var tdStyle = "", tdClass = "";
                        if (col.hide) {
                            tdStyle = ' style="display:none"';
                        }

                        if (p.sortname && p.sortname == p._lowerDict[col.name])
                            tdClass = ' class="sorted"';

                        //process & template
                        var divStyle = "";
                        if (!p.nowrap || col.wrap) divStyle = ';white-space:normal';
                        stack.appends('<td', tdStyle, tdClass,
                            '><div style="text-align:', col.align, ';width:', col.width, 'px;', divStyle, '"');
                        if (!col.hide) {
                            stack.appends(' class="b-col-', vIndex, '"');
                            vIndex++;
                        }

                        var tdDiv;
                        if (col.process) {
                            var dd = document.createElement("div");
                            col.process($(dd), g.getRow(row.Id));
                            tdDiv = dd.innerHTML;
                        } else if (col.tmpl) {
                            tdDiv = col.tmpl(g.getRow(row.Id));
                        } else {
                            tdDiv = entity[p._lowerDict[col.name]];
                        }
                        stack.appends('>', tdDiv, '</div></td>');
                    }
                    stack.append('</tr>');
                }
                //end process jsondata

                stack.append('</tbody></table>');
                g.bDiv.innerHTML = stack.toString();
                this.addRowProp();

                this.rePosDrag();
                if (p.hideOnSubmit) $(g.block).remove();
                if (p._scrollLeft) {
                    this.syncScrollLeft();
                }
                if ($.browser.opera)
                    $(g.bDiv).css('visibility', 'visible');

                //if ($.browser.msie && $.browser.version <= 7.0)
                g.widthFix();
                g.heightFix();

                return true;
            },
            changeSort: function (thSelector) {
                //change sortorder
                if (this.loading)
                    return;

                //$(g.nDiv).hide();
                //$(g.nBtn).hide();
               
                if (p.sortname == $(thSelector).attr('abbr')) {
                    if (p.sortorder == 'asc')
                        p.sortorder = 'desc';
                    else
                        p.sortorder = 'asc';
                }

                $(thSelector).addClass('sorted').siblings().removeClass('sorted');
                $('.sdesc', this.hDiv).removeClass('sdesc');
                $('.sasc', this.hDiv).removeClass('sasc');
                $('div', thSelector).addClass('s' + p.sortorder);
                
              

                p.sortname = $(thSelector).attr('abbr');
               
              
                if (p.onChangeSort)
                    p.onChangeSort(p.sortname, p.sortorder);
                else {
                    g.makeHistoryInfo();
                    g.populate();
                }
                return;
            },
            buildpager: function (data) {
                if (p.usepager) {
                    $('.pcontrol input', this.pDiv).val(p.page);
                    $('.pcontrol span', this.pDiv).html(p.pages);
                    var r1 = (p.page - 1) * p.rp + 1;
                    var r2 = r1 + p.rp - 1;
                    if (p.total < r2)
                        r2 = p.total;
                    var stat = p.pagestat;
                    stat = stat.replace(/{from}/, r1);
                    stat = stat.replace(/{to}/, r2);
                    stat = stat.replace(/{total}/, p.total);
                    $('.pPageStat', this.pDiv).html(stat);
                    $('.TotalString', this.pDiv).html(data.TotalString);
                }
                else {
                    p.pages = Math.ceil(p.total / p.rp);
                    if ($.fn.pager)
                        $(p.pager).pager(p, function (pg) {
                            p.newp = pg;
                            g.makeHistoryInfo();
                            g.populate();
                        });
                }
            },
            populate: function () {
                //get latest data
                if (this.loading) return;
                if (p.onSubmit && !p.onSubmit()) return;
                this.loading = true;
                if (!p.url) return;
                
                $('.pPageStat', this.pDiv).html(p.procmsg);
                $('.pReload', this.pDiv).addClass('loading');
                $(g.block).css({ top: g.bDiv.offsetTop });
                if (p.hideOnSubmit) $(this.gDiv).prepend(g.block);
                if ($.browser.opera)
                    $(g.bDiv).css('visibility', 'hidden');
                if (!p.newp || p.newp < 1) p.newp = 1;
                if (p.page > p.pages) p.page = p.pages;
                var param =
                {
                    'page': p.newp,
                    'pagesize': p.rp,
                    'sortname': p.sortname,
                    'sortorder': p.sortorder
                };
                if (p.params) {
                    if ($.isArray(p.params)) {
                        for (var pi = 0; pi < p.params.length; pi++) {
                            var key = p.params[pi]['name'];
                            var val = p.params[pi]['value'];
                            if (key != '' && val != '' && val != '\u652f\u6301\u7528\u002a\u6a21\u7cca\u67e5\u8be2')
                                param[key] = val;
                        }
                    }
                    else {
                        for (var x in p.params) {
                            param[x] = p.params[x];
                        }
                    }
                }
                //support * search
                $.ajax({
                    type: p.method,
                    url: p.url,
                    data: param,
                    dataType: 'json',
                    success: function (data) {
                        if (p.pSuccess) { p.pSuccess(); }
                        g.addData(data);
                        if (p.onSuccess) p.onSuccess();
                    },
                    error: function (request, textStatus, errorThrown) {
                        try {
                            if (p.onError) p.onError(request, textStatus, errorThrown);
                            if (p.pSuccess) { p.pSuccess(); }
                            g.addData(null);
                            return false;
                        }
                        catch (e) {
                            this.loading = false;
                            return false;
                        }
                    }
                });
            },
            changePage: function (ctype) {
                //change page
                if (this.loading) return;
                switch (ctype) {
                    case 'first':
                        p.newp = 1;
                        break;
                    case 'prev':
                        if (p.page > 1)
                            p.newp = parseInt(p.page) - 1;
                        break;
                    case 'next':
                        if (p.page < p.pages)
                            p.newp = parseInt(p.page) + 1;
                        break;
                    case 'last':
                        p.newp = p.pages;
                        break;
                    case 'input':
                        var nv = parseInt($('.pcontrol input', this.pDiv).val());
                        if (isNaN(nv)) nv = 1;
                        if (nv < 1) nv = 1;
                        else if (nv > p.pages)
                            nv = p.pages;
                        $('.pcontrol input', this.pDiv).val(nv);
                        p.newp = nv;
                        break;
                }

                if (p.newp == p.page) return;

                if (p.onChangePage)
                    p.onChangePage(p.newp);
                else {
                    g.makeHistoryInfo();
                    this.populate();
                }

            },
            getColNames: function () {
                var arr = new Array();
                for (i = 0; i < p.colModel.length; i++)
                    arr.push(p.colModel[i].name);
                return arr;
            },
            getRow: function (key) {
                if (key.indexOf("row") > -1 || isNaN(key))
                    key = key.substr(3);
                if (g) {
                    return p.rows[key];
                }
                return undefined;
            },
            getAllRows: function () {
                return p.rows;
            },
          

            addRowProp: function () {
                $('tbody tr', g.bDiv).each(function () {
                    $(this).click(function (e) {
                        var obj = (e.target || e.srcElement);
                        if (obj.href || obj.type) return;
                        if (!$(this).hasClass('trSelected') && !e.ctrlKey)
                            $(this).addClass('trSelected');
                        if (!(p.mulitSelect && (e.ctrlKey || e.shiftKey)))
                            $(this).siblings().removeClass('trSelected');
                        if (p.mulitSelect) {
                            if (e.shiftKey) {
                                var tb = $("tr", $(this).parent());
                                var i1 = tb.index(this);
                                var i2 = tb.index(g.multisel);
                                for (i = Math.min(i1, i2) + 1; i < Math.max(i1, i2) ; i++) {
                                    if (!tb.eq(i).hasClass('trSelected'))
                                        tb.eq(i).addClass('trSelected');
                                }
                            }
                            if (e.ctrlKey) {
                                $(this).toggleClass('trSelected');
                            }
                            $(this).focus();
                            g.multisel = $(this);
                        }

                        //alert($(g.bDiv).css("height"));
                    });
                    if (p.isIE6) {
                        $(this).hover(function () {
                            $(this).addClass('trOver');
                        }, function () {
                            $(this).removeClass('trOver');
                        });
                    }
                });
            },
            pager: 0
        };
        //create model if any
        //var i;


        //init divs
        g.gDiv = document.createElement('div'); //create global container
        g.hDiv = document.createElement('div'); //create header container
        g.bDiv = document.createElement('div'); //create body container
        g.vDiv = document.createElement('div'); //create grip
        g.rDiv = document.createElement('div'); //create horizontal resizer
        g.cDrag = document.createElement('div'); //create column drag
        g.block = document.createElement('div'); //creat blocker
        g.tDiv = document.createElement('div'); //create toolbar
        g.sDiv = document.createElement('div');
        g.oDiv = document.createElement('div');

        if (p.usepager) {
            g.pDiv = document.createElement('div');
        }
        //create pager container
        //g.hTable = document.createElement('table');

        //set gDiv
        g.gDiv.className = 'expressGrid';
        if (p.width && p.width != 'auto') g.gDiv.style.width = p.width + 'px';
        var gDivDom = $(g.gDiv);
        //add conditional classes
        if ($.browser.msie)
            gDivDom.addClass('ie');

        if (p.novstripe)
            gDivDom.addClass('novstripe');
        tDom.before(g.gDiv);
        gDivDom.append(t);

        //set toolbar
        if (p.buttons) {
            g.tDiv.className = 'tDiv';
            var tDiv2 = document.createElement('div');
            tDiv2.className = 'tDiv2';

            for (var buti = 0, butLen = p.buttons.length; buti < butLen; buti++) {
                var btn = p.buttons[buti];
                if (!btn.separator) {
                    var btnDiv = document.createElement('div');
                    btnDiv.className = 'fbutton';
                    btnDiv.innerHTML = "<div><span>" + btn.name + "</span></div>";
                    if (btn.bclass)
                        $('span', btnDiv)
                            .addClass(btn.bclass)
                            .css({ paddingLeft: 20 });
                    btnDiv.onpress = btn.onpress;
                    btnDiv.name = btn.name;
                    if (btn.onpress) {
                        $(btnDiv).click(function () { this.onpress(this.name, g.gDiv); });
                    }
                    $(tDiv2).append(btnDiv);
                    if (p.isIE6) {
                        $(btnDiv).hover(function () { $(this).addClass('fbOver'); },
                            function () { $(this).removeClass('fbOver'); });
                    }

                } else {
                    $(tDiv2).append("<div class='btnseparator'></div>");
                }
            }
            $(g.tDiv).append(tDiv2).append("<div style='clear:both'></div>");
            gDivDom.prepend(g.tDiv);
        }

        //set hDiv
        g.hDiv.className = 'hDiv';

        tDom.before(g.hDiv);


        var headHtml = new stringBuilder();
        headHtml.append('<table cellpadding="0" cellspacing="0">');
        if (p.colModel) {
            headHtml.appends('<thead><tr>');
            for (var i = 0, ilen = p.colModel.length; i < ilen; i++) {
                var cm = p.colModel[i];
                var width = cm.width ? cm.width : 100;
                var divClass = "";
                //th start
                headHtml.appends('<th axis="col', i, '"');
                if (cm.name && cm.sortable) {
                    headHtml.appends(' abbr="', cm.name, '"');
                    if (cm.name == p.sortname) {
                        headHtml.append(' class="sorted"');
                        divClass = ' class="s' + p.sortorder + '"';
                    }
                }
                if (cm.name) {
                    headHtml.appends(' cln="', g.getLower(cm.name), '"');
                }
                if (cm.hide) {
                    headHtml.append(' style="display:none;"');
                }
                //div start
                headHtml.appends('><div style="width:', width, 'px');
                if (cm.align)
                    headHtml.appends('text-align:', cm.align);
                headHtml.appends('"', divClass, '>', cm.display, '</div></th>');
                //div end
                //th end
            }
            headHtml.appends('</tr></thead>');
            //tDom.prepend(headHtml.toString());
        }
        headHtml.append("</table>");
        //set hTable

        $(g.hDiv).append('<div class="hDivBox">' + headHtml.toString() + '</div>');


        //setup thead
        //first memory
        //var theadDom = $(thead);
        var ths = $('thead tr:first th', g.hDiv);
        for (var thIndex = 0, i2Len = p.colModel.length; thIndex < i2Len; thIndex++) {
            var c = p.colModel[thIndex];
            var th = ths[thIndex];
            var thDomTemp = $(th);
            
            if (thDomTemp.attr('abbr')) {
                thDomTemp.click(function (e) {
                    if (!$(this).hasClass('thOver')) return;
                    var obj = (e.target || e.srcElement);
                    if (obj.href || obj.type) return;
                    g.changeSort(this);
                });
            }
            if (p.colMove) {
                thDomTemp.mousedown(function (e) {
                    g.dragStart('colMove', e, this);
                });
            }
            thDomTemp.hover(
                   function () {
                       if (!g.colresize && !$(this).hasClass('thMove') && !g.colCopy)
                           $(this).addClass('thOver');
                       if ($(this).attr('abbr') != p.sortname && !g.colCopy && !g.colresize && $(this).attr('abbr'))
                           $('div', this).addClass('s' + p.sortorder);
                       else if ($(this).attr('abbr') == p.sortname && !g.colCopy && !g.colresize && $(this).attr('abbr')) {
                           var no;
                           if (p.sortorder == 'asc') no = 'desc';
                           else no = 'asc';
                           $('div', this).removeClass('s' + p.sortorder).addClass('s' + no);
                       }

                       if (g.colCopy) {
                           var n = $('th', g.hDiv).index(this);

                           if (n == g.dcoln) return;

                           if (n < g.dcoln) $(this).append(g.cdropleft);
                           else $(this).append(g.cdropright);

                           g.dcolt = n;

                       } else if (!g.colresize) {


                       }

                   },
                   function () {
                       $(this).removeClass('thOver');
                       if ($(this).attr('abbr') != p.sortname) $('div', this).removeClass('s' + p.sortorder);
                       else if ($(this).attr('abbr') == p.sortname) {
                           var no;
                           if (p.sortorder == 'asc') no = 'desc';
                           else no = 'asc';

                           $('div', this).addClass('s' + p.sortorder).removeClass('s' + no);
                       }
                       if (g.colCopy) {
                           $(g.cdropleft).remove();
                           $(g.cdropright).remove();
                           g.dcolt = null;
                       }
                   }
               );
        }
        //set bDiv
        g.bDiv.className = 'bDiv';
        tDom.before(g.bDiv);
        var bDivDom = $(g.bDiv);
        var timeout = false;
        bDivDom.scroll(function () {
            g.syncScrollLeft();
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(function () {
                g.scroll();
            }, 100);
        })
        .css({
            height: (!p.height || p.height == 'auto') ? 'auto' : p.height + "px"
        });

        $(g.gDiv).append(g.oDiv);
        $(g.oDiv).append(t).hide();
        if (!p.height) p.height = 'auto';
        if (p.height == 'auto') {
            $(g.bDiv).addClass('autoht').css({ 'overflow-y': 'hidden' });;
        }


        //add td properties 1 createGrid
        // g.addCellProp(); if table

        //add row properties
        //g.addRowProp(); if table

        //set cDrag

        var cdcol = $('thead tr:first th:first', g.hDiv).get(0);

        if (cdcol != null) {
            g.cDrag.className = 'cDrag';

            bDivDom.before(g.cDrag);

            var cdheight = bDivDom.height();
            var hdheight = $(g.hDiv).height();


            $(g.cDrag).css({ top: -hdheight + 'px' });

            for (var i3 = 0, i3Len = p.colModel.length; i3 < i3Len; i3++) {
                if (p.colModel[i3].hide) {
                    continue;
                }
                var cgDiv = document.createElement('div');
                cgDiv.className = "cg-col-" + i3;
                var cgDom = $(cgDiv);
                $(g.cDrag).append(cgDiv);
                if (!p.cgwidth) p.cgwidth = cgDom.width();

                cgDom.css({ height: cdheight + hdheight })
                    .mousedown(function (e) { g.dragStart('colresize', e, this); });

                if (p.isIE6) {
                    g.fixHeight(gDivDom.height());
                    cgDom.hover(function () {
                        g.fixHeight();
                        $(this).addClass('dragging');
                    }, function () {
                        if (!g.colresize)
                            $(this).removeClass('dragging');
                    });
                }
            }



        }
        //add strip		
        if (p.striped)
            $('tbody tr:odd', g.bDiv).addClass('erow');
        if (p.resizable && p.height != 'auto') {
            g.vDiv.className = 'vGrip';
            $(g.vDiv).mousedown(function (e) { g.dragStart('vresize', e); }).html('<span></span>');
            bDivDom.after(g.vDiv);
        }

        if (p.resizable && p.width != 'auto' && !p.nohresize) {
            g.rDiv.className = 'hGrip';
            $(g.rDiv).mousedown(function (e) { g.dragStart('vresize', e, true); })
        .html('<span></span>').css('height', gDivDom.height());
            if (p.isIE6) {
                $(g.rDiv).hover(function () { $(this).addClass('hgOver'); }, function () { $(this).removeClass('hgOver'); });
            }
            gDivDom.append(g.rDiv);
        }

        // add pager
        if (p.usepager) {
            var html = ' <div class="pGroup"><div class="pFirst pButton"><span></span></div><div class="pPrev pButton"><span></span></div> </div> <div class="btnseparator"></div> <div class="pGroup"><span class="pcontrol">\u5f53\u524d\u7b2c <input type="text" size="4" value="1" />  \u9875\u5171 <span> 1 </span>\u9875</span></div> <div class="btnseparator"></div> <div class="pGroup"> <div class="pNext pButton"><span></span></div><div class="pLast pButton"><span></span></div> </div> <div class="btnseparator"></div> <div class="pGroup"> <div class="pReload pButton"><span></span></div> </div> <div class="btnseparator"></div> <div class="pGroup"><span class="pPageStat"></span><span class="TotalString"></span></div>';
            g.pDiv.className = 'pDiv';
            g.pDiv.innerHTML = '<div class="pDiv2">' + html + '</div>';
            bDivDom.after(g.pDiv);
            //$('div', g.pDiv).html(html);

            $('.pReload', g.pDiv).click(function () { g.populate(); });
            $('.pFirst', g.pDiv).click(function () { g.changePage('first'); });
            $('.pPrev', g.pDiv).click(function () { g.changePage('prev'); });
            $('.pNext', g.pDiv).click(function () { g.changePage('next'); });
            $('.pLast', g.pDiv).click(function () { g.changePage('last'); });
            $('.pcontrol input', g.pDiv).keydown(function (e) { if (e.keyCode == 13) g.changePage('input'); });
            if (p.disabledGoTo) {
                $('.pFirst,.pLast', g.pDiv).hide();
                $('.pcontrol input', g.pDiv).attr("disabled", true);
            }
            if ($.browser.msie && $.browser.version < 7)
                $('.pButton', g.pDiv).hover(function () {
                    $(this).addClass('pBtnOver');
                }, function () { $(this).removeClass('pBtnOver'); });

            if (p.useRp) {
                var opt = "";
                for (var nx = 0; nx < p.rpOptions.length; nx++) {
                    var sel;
                    if (p.rp == p.rpOptions[nx]) sel = 'selected="selected"'; else sel = '';
                    opt += "<option value='" + p.rpOptions[nx] + "' " + sel + " >" + p.rpOptions[nx] + "&nbsp;&nbsp;</option>";
                };
                $('.pDiv2', g.pDiv).prepend("<div class='pGroup'><select name='rp'>" + opt + "</select></div> <div class='btnseparator'></div>");
                $('select', g.pDiv).change(function () {
                    if (p.onRpChange)
                        p.onRpChange(+this.value);
                    else {
                        p.newp = 1;
                        p.rp = +this.value;
                        g.populate();
                    }
                });
            }
        }
        $(g.pDiv, g.sDiv).append("<div style='clear:both'></div>");

        // add title
        if (p.title) {
            var mDiv = new stringBuilder();
            mDiv.appends('<div class="mDiv"><div class="ftitle">', p.title, '</div>');

            //g.mDiv.className = 'mDiv';

            if (p.showTableToggleBtn) {
                mDiv.append('<div class="ptogtitle" title="Minimize/Maximize Table"><span></span></div>');
            }
            //g.mDiv.innerHTML = mDivhtml;
            mDiv.append('</div>');
            gDivDom.prepend(mDiv.toString());

            if (p.showTableToggleBtn) {
                $('div.ptogtitle', gDivDom).click(function () {
                    gDivDom.toggleClass('hideBody');
                    $(this).toggleClass('vsble');
                });
            }
            //g.rePosDrag();
        }

        //setup cdrops
        g.cdropleft = document.createElement('span');
        g.cdropleft.className = 'cdropleft';
        g.cdropright = document.createElement('span');
        g.cdropright.className = 'cdropright';

        //add block
        g.block.className = 'gBlock';
        var gh = bDivDom.height();
        var gtop = g.bDiv.offsetTop;
        $(g.block).css(
        {
            width: g.bDiv.style.width,
            height: gh,
            background: 'white',
            position: 'relative',
            marginBottom: (gh * -1),
            zIndex: 1,
            top: gtop,
            left: '0px'
        }
        );
        $(g.block).fadeTo(0, p.blockOpacity);


        // add date edit layer
        //$(g.iDiv).addClass('iDiv').css({ display: 'none' });
        //bDivDom.append(g.iDiv);

        // add expressGrid events
        bDivDom.hover(function () { }, function () { if (g.multisel) g.multisel = false; });

        //add document events
        $(document)
         .mousemove(function (e) { g.dragMove(e); })
          .mouseup(function () { g.dragEnd(); }).mouseleave(function () { g.heightFix(); })
          .hover(function () { }, function () { g.dragEnd(); });
        if (p.isIE7) {
            $(window).resize(function () {
                g.widthFix();
            });
        }
        //browser adjustments
        if (p.isIE6) {
            $('.hDiv,.bDiv,.mDiv,.pDiv,.vGrip,.tDiv, .sDiv', g.gDiv).css({ width: '100%' });
            gDivDom.addClass('ie6');
            if (p.width != 'auto') gDivDom.addClass('ie6fullwidthbug');
        }

        g.rePosDrag();
        g.fixHeight();

        //make grid functions accessible
        t.p = p;
        t.grid = g;

        // load data
        if (p.url && p.autoload && (!$.fn.historyStore || !$.fn.historyStore.hasHistory())) {
            g.populate();
        }
        //event on Inited
        if (p.onInited)
            p.onInited();
        if ($(".expressGrid .original").css("width") == '100%') {
            p._isTableFullWidth = true;
        }
        return t;
    };

    $.fn.expressGrid = function (p) {
        return this.each(function () {
            var t = this;
            if (!documemtLoadCompleted) {
                $(document).ready(function () { $.createGrid(t, p); });
            } else {
                $.createGrid(t, p);
            }
        });
    };

    $.fn.reload = function (p) {
        return this.each(function () {
            if (this.grid && this.p.url) this.grid.populate();
        });
    };

    $.fn.setOptions = function (p) {
        return this.each(function () {
            if (this.grid) $.extend(this.p, p);
        });
    };

    $.fn.getParam = function (key) {
        var v = "";
        this.each(function () {
            if (this.grid && this.p[key])
                v = this.p[key];
        });
        return v;
    };

    $.fn.loadPage = function (page, data, successEvent) {
        return this.setOptions({ newp: page, params: data, pSuccess: successEvent }).reload();
    };

    $.fn.getDataByKey = function (key) {
        var ret = {};
        this.each(function () {
            if (this.grid)
                ret = this.grid.getRow(key);
        });
        return ret;
    };
    $.fn.getAllData = function () {
        var ret = {};
        this.each(function () {
            if (this.grid)
                ret = this.grid.getAllRows();
        });
        return ret;
    };

    $.fn.getSelectedData = function (pro) {
        var ret = [];
        this.each(function () {
            if (this.grid) {
                var g2 = this.grid;
                $('.trSelected').each(function () {
                    var data = g2.getRow($(this).attr('id'));
                    if (data && data[pro]) {
                        ret.push(data[pro]);
                    }
                });
                return ret;
            }
            throw "grid is not exists";
        });
        return ret;
    };
    $.fn.getSelectedId = function () {
        var ret = "";
        this.each(function () {
            if (this.grid) {
                $('.trSelected', this.grid.bDiv).each(function () {
                    ret = $(this).attr('id');
                });
            }
        });
        return ret;
    };


    $.fn.flexToggleCol = function (cid, visible) { // function to reload grid
        return this.each(function () {
            if (this.grid) this.grid.toggleCol(cid, visible);
        });
    };

    $.fn.bindData = function (data) { // function to add data to grid
        return this.each(function () {
            if (this.grid) this.grid.addData(data);
        });
    };

    $.fn.noSelect = function (p) { //no select plugin by me :-)
        var prevent;
        if (p == null)
            prevent = true;
        else
            prevent = p;
        if (prevent) {
            return this.each(function () {
                if ($.browser.msie || $.browser.safari) $(this).bind('selectstart', function () { return false; });
                else if ($.browser.mozilla) {
                    $(this).css('MozUserSelect', 'none');
                    $('body').trigger('focus');
                }
                else if ($.browser.opera) $(this).bind('mousedown', function () { return false; });
                else $(this).attr('unselectable', 'on');
            });
        } else {
            return this.each(function () {
                if ($.browser.msie || $.browser.safari) $(this).unbind('selectstart');
                else if ($.browser.mozilla) $(this).css('MozUserSelect', 'inherit');
                else if ($.browser.opera) $(this).unbind('mousedown');
                else $(this).removeAttr('unselectable', 'on');
            });
        }
    }; //end noSelect



    $.fn.gridext = function (loadUrl, colModel, menuId, menuProcess, ps) {
        var obj = $(this);
        var errorHandle = function () { };
        if (window.coreError) {
            errorHandle = window.coreError;
        }
        var menuSuccess = function (psuccess) {
            if (ps.onShown) {
                ps.onShown(obj);
            }
            if (!$.fn.chmenu || !menuProcess) return;
            var getParams = function () {
                var data;
                if (!ps.mulitSelect) {
                    data = obj.getDataByKey(obj.getSelectedId());
                } else {
                    data = {};
                }
                return { 'sender': obj, 'row': data };
            };
            $('td', obj[0].grid.gDiv).chmenu(menuId,
                {
                    onShow: function (e, c) { //c is cell
                        if (obj.getSelectedId() != '') {
                            $('li', menuId).show();
                            if (ps.onMenuShow) {
                                ps.onMenuShow(getParams());
                            }
                        } else
                            $('li', menuId).hide();
                    },
                    onHide: function (e, c) {
                        if (ps.onMenuHide && obj.getSelectedId() != '')
                            ps.onMenuHide(getParams());

                    },
                    onSelect: function (e, c) {
                        var param = getParams();
                        var mid = $(this).attr("id");
                        if ($(this).hasClass("separator") || $(this).hasClass("disabled")) return;
                        if (menuProcess && menuProcess[mid]) 
                            menuProcess[mid](param);
                        else
                            alert('please add a process for ths menu with id:' + mid);
                    }
                });

        };
        obj.expressGrid(
            $.extend({
                url: loadUrl,
                colModel: colModel
            }, ps,
                {
                    onError: errorHandle,
                    minheight: ps.minheight == null ? 80 : ps.minheight,
                    pager: ps.pager == null ? ".page" : ps.pager,
                    onSuccess: menuSuccess
                })
        );
    };
})(jQuery);


