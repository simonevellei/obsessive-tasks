import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { forkJoin } from 'rxjs';
import { HttpService } from '../services/http.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  @ViewChild('taskEditor', { static: false }) taskEditor: ElementRef<HTMLElement>;
  @ViewChild('scroller', { static: false }) scroller: ElementRef<HTMLElement>;

  preventSelect: boolean = false;

  tabIndex: number = 0;

  owners: any[] = [
    { name: "Simone Vellei", email: "simone.vellei@gmail.com", monogram: "SV" },
    { name: "Fabio Strovegli", email: "fabio.strovegli@gmail.com", monogram: "FS" },
    { name: "Lorenzo Degioanni", email: "lorenzo.degioanni@gmail.com", monogram: "LD" },
    { name: "Tamara Cavuto", email: "tamara.cavuto@gmail.com", monogram: "TC" },
    { name: "EMR Group", email: "emr", monogram: "EMR" },
    { name: "Other group", email: "other", monogram: "OG" },
  ]

  efforts: any[] = [
    { name: "Nessuno", value: 0 },
    { name: "0.5", value: 0.5 },
    { name: "1", value: 1 },
    { name: "2", value: 2 },
    { name: "3", value: 3 },
    { name: "5", value: 5 },
    { name: "8", value: 8 },
    { name: "13", value: 13 },
    { name: "20", value: 20 },
    { name: "40", value: 40 },
    { name: "100", value: 100 },

  ]

  priorities: any[] = [
    { name: "Inutile", value: 0, icon: "💤" },
    { name: "Normale", value: 3, icon: "🔔" },
    { name: "Urgente", value: 5, icon: "🔥" }
  ]

  statuses: any[] = [
    { name: "Startable", code: 'startable', color: '#bdbdbd' },
    { name: "Started", code: 'started', color: '#ffee58' },
    { name: "Completed", code: 'completed', color: '#9ccc65' },
    { name: "Tested", code: 'tested', color: '#ce93d8' },
    { name: "Paused", code: 'paused', color: '#bdbdbd' }
  ]

  groupedTasks: any = {};
  groupedTopics: any = {};

  taskMap: any = {};
  saving: boolean = false;

  constructor(private http: HttpService) {

  }

  ngOnInit() {
    this.load();
    setTimeout(() => {
      this.taskEditor.nativeElement.addEventListener("paste", (e: any) => {
        // cancel paste
        e.preventDefault();

        // get text representation of clipboard
        var text = (e.originalEvent || e).clipboardData.getData('text/plain');

        // insert text manually
        document.execCommand("insertHTML", false, text);
      });
    });
  }

  setValue(value: string) {
    setTimeout(() => {
      this.taskEditor.nativeElement.innerHTML = value;
    })
  }

  getValue() {
    return this.taskEditor.nativeElement.innerHTML;
  }

  execCommand(command: string, options: any = null) {
    document.execCommand(command, false, options);
  }

  clearFormatting(tags: string) {
    this.removeSelectedElements(tags);
  }

  @HostListener('document:keydown.esc', ['$event'])
  onEsc(event: KeyboardEvent) {
    event.preventDefault();
    this.unselectTask();
  }

  @HostListener('document:keydown.control.enter', ['$event'])
  onControlEnter(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('insertUnorderedList');
  }

  @HostListener('document:keydown.control.B', ['$event'])
  onCtrlB(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('bold');
  }

  @HostListener('document:keydown.control.I', ['$event'])
  onCtrlI(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('italic');
  }

  @HostListener('document:keydown.control.1', ['$event'])
  onCtrl1(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('formatBlock', 'H1')
  }

  @HostListener('document:keydown.control.2', ['$event'])
  onCtrl2(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('formatBlock', 'H2')
  }

  @HostListener('document:keydown.control.3', ['$event'])
  onCtrl3(event: KeyboardEvent) {
    event.preventDefault();
    this.clearFormatting('h1,h2,h3,h4,h5,h6');
  }

  @HostListener('document:keydown.control.K', ['$event'])
  onCtrlK(event: KeyboardEvent) {
    event.preventDefault();
    this.assignTask();
  }


  @HostListener('document:keydown.tab', ['$event'])
  onTab(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('indent');
  }

  @HostListener('document:keydown.shift.tab', ['$event'])
  onShiftTab(event: KeyboardEvent) {
    event.preventDefault();
    this.execCommand('outdent');
  }

  nextNode(node) {
    if (node.hasChildNodes()) {
      return node.firstChild;
    } else {
      while (node && !node.nextSibling) {
        node = node.parentNode;
      }
      if (!node) {
        return null;
      }
      return node.nextSibling;
    }
  }

  getRangeSelectedNodes(range, includePartiallySelectedContainers) {
    var node = range.startContainer;
    var endNode = range.endContainer;
    var rangeNodes = [];

    // Special case for a range that is contained within a single node
    if (node == endNode) {
      rangeNodes = [node];
    } else {
      // Iterate nodes until we hit the end container
      while (node && node != endNode) {
        rangeNodes.push(node = this.nextNode(node));
      }

      // Add partially selected nodes at the start of the range
      node = range.startContainer;
      while (node && node != range.commonAncestorContainer) {
        rangeNodes.unshift(node);
        node = node.parentNode;
      }
    }

    // Add ancestors of the range container, if required
    if (includePartiallySelectedContainers) {
      node = range.commonAncestorContainer;
      while (node) {
        rangeNodes.push(node);
        node = node.parentNode;
      }
    }

    return rangeNodes;
  }

  getSelectedNodes() {
    var nodes = [];
    if (window.getSelection) {
      var sel = window.getSelection();
      for (var i = 0, len = sel.rangeCount; i < len; ++i) {
        nodes.push.apply(nodes, this.getRangeSelectedNodes(sel.getRangeAt(i), true));
      }
    }
    return nodes;
  }

  replaceWithOwnChildren(el) {
    var parent = el.parentNode;
    while (el.hasChildNodes()) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  }

  removeSelectedElements(tagNames) {
    var tagNamesArray = tagNames.toLowerCase().split(",");
    this.getSelectedNodes().forEach((node) => {
      if (node.nodeType == 1 &&
        tagNamesArray.indexOf(node.tagName.toLowerCase()) > -1) {
        this.replaceWithOwnChildren(node);
      }
    });
  }

  assignTask() {
    let id = this.generateTaskUUID();
    this.execCommand('createLink', "task://" + id);
    this.setupTaskComponent();
    this.taskMap.selected = this.taskMap[id];
    this.setupTaskComponent();
  }

  getParentTaskNode(element) {
    if (element.nodeType == 3) {
      return this.getParentTaskNode(element.parentElement);
    } else if (element.tagName.toLowerCase() == 'a' && element.classList.contains("task")) {
      return element;
    } else if (element.parentElement != null) {
      return this.getParentTaskNode(element.parentElement);
    }
    return null;
  }

  link(id1, ele1: HTMLAnchorElement, id2, ele2: HTMLAnchorElement) {
    let id = "line--" + id1 + "--" + id2;
    let line: HTMLDivElement = this.taskEditor.nativeElement.querySelector("#" + id);
    if (!line) {
      line = document.createElement("div");
      line.classList.add("line");
      line.setAttribute("id", id);
      this.taskEditor.nativeElement.appendChild(line);

      let arrow = document.createElement("div");
      arrow.classList.add("arrow");
      line.appendChild(arrow);
    }

    let x1 = (ele1.offsetLeft + ele1.clientWidth / 2) - this.scroller.nativeElement.scrollLeft;
    let y1 = (ele1.offsetTop + ele1.clientHeight / 2) - this.scroller.nativeElement.scrollTop;

    let x2 = (ele2.offsetLeft + ele2.clientWidth / 2) - this.scroller.nativeElement.scrollLeft;;
    let y2 = (ele2.offsetTop + ele2.clientHeight / 2) - this.scroller.nativeElement.scrollTop;;

    /*
    if (y1 < y2) {
      y1 = y1 + ele1.clientHeight/2;
    }

    if (y1 > y2) {
      y1 = y1 - ele1.clientHeight/2;
    }
    
    if (x1 < x2) {
      x1 = x1 + ele1.clientWidth/2;
    }

    if (x1 > x2) {
      x1 = x1 - ele1.clientWidth/2;
    }
    */

    var angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    var length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    line.setAttribute("contenteditable", "false");
    line.style.left = x1 + "px";
    line.style.top = y1 + 'px';
    line.style.visibility = 'visible';
    line.style.width = Math.abs(length) + 'px';
    line.style.transform = "rotate(" + Math.round(angle) + "deg)";
    line.style.transformOrigin = "0 0";

  }

  setupTaskComponent(forceUnselect: boolean = false) {

    var node = document.getSelection().anchorNode;
    let selectedNode = this.getParentTaskNode(node);

    // Select current task
    if (selectedNode && selectedNode.classList.contains("task") && !forceUnselect && !this.preventSelect) {
      let href = selectedNode.getAttribute("href");
      if (href) {
        let prefix = "task://"
        let id = href.substring(prefix.length);
        this.taskMap.selected = this.taskMap[id];
      }
    }

    // Rimuovo i span
    this.taskEditor.nativeElement.querySelectorAll(".task").forEach(node => {
      if (!node.getAttribute("href")) {
        var parent = node.parentNode;
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
      }
    });


    // Remove orphan task-info elements
    this.taskEditor.nativeElement.querySelectorAll("span.task-info").forEach(node => {
      if (node.parentElement.tagName.toLowerCase() != 'a') {
        node.remove();
      } else if (node.parentElement.textContent.trim() == node.textContent.trim()) {
        node.parentElement.remove();
      }
    });

    // Setup not orphan task-info
    let position = 0;
    let currentSection = null;
    this.taskEditor.nativeElement.querySelectorAll("a,h1,h2").forEach(node => {
      let nodeName = node.tagName.toLowerCase();
      if (nodeName == 'h1' || nodeName == 'h2') {
        currentSection = node.textContent;
        return;
      }
      position++;
      let href = node.getAttribute("href");
      let prefix = "task://"
      if (href && href.startsWith(prefix) && !node.parentElement.classList.contains("task")) {
        let id = href.substring(prefix.length);
        let task = this.taskMap[id];
        if (!task) {
          task = {
            id: id,
            status: 'startable',
            effort: 0,
            dependencies: [],
            owner: null,
            section: null,
            priority: 3,
            position: 0
          };
          this.taskMap[id] = task;
        }
        task.title = this.getNodeText(node);
        task.position = position;
        task.section = currentSection;
        task.priorityInfo = this.priorities.find(x => x.value == task.priority);
        task.statusInfo = this.statuses.find(x => x.code == task.status);
        node.setAttribute("id", id);
        node.classList.add("task");
        node.classList.add(task.status);
        node.classList.remove("selected");
        this.statuses.forEach(status => {
          node.classList.remove(status.code);
        })
        if (task.status) {
          node.classList.add(task.status);
        }
        if (this.taskMap.selected && task.id == this.taskMap.selected.id) {
          node.classList.add("selected");
        }
        let infos = node.querySelectorAll("span.task-info");
        if (infos.length > 0) {
          infos.forEach(node => {
            node.remove();
          })
        }
        let info: HTMLSpanElement = node.querySelector("span.task-info");
        if (!info) {
          info = document.createElement("span");
          info.setAttribute("contenteditable", "false");
          info.classList.add("task-info");
          node.appendChild(info);
        }
        info.innerText = task.owner == null ? "?" : task.owner.monogram;

        let effort: HTMLSpanElement = info.querySelector("span.task-effort");
        if (!effort) {
          effort = document.createElement("span");
          effort.setAttribute("contenteditable", "false");
          effort.classList.add("task-effort");
          info.appendChild(effort);
        }
        effort.innerText = task.effort;

        let priority: HTMLSpanElement = info.querySelector("span.task-priority");
        if (!priority) {
          priority = document.createElement("span");
          priority.setAttribute("contenteditable", "false");
          priority.classList.add("task-priority");
          info.appendChild(priority);
        }
        let priorityValue: any = this.priorities.find(x => x.value == task.priority);
        priority.innerText = priorityValue ? priorityValue.icon : "";
      }
    });

    this.taskEditor.nativeElement.querySelectorAll(".line").forEach(node => {
      node.remove();
    });

    Object.keys(this.taskMap).forEach(x => {
      if (x != 'selected') {
        var source: HTMLAnchorElement = this.taskEditor.nativeElement.querySelector("[href='task://" + x + "']");
        if (!source) {
          delete this.taskMap[x];
        }
      }
    });

    // Connections!
    if (this.taskMap.selected) {
      let sourceId = this.taskMap.selected.id;
      var source: HTMLAnchorElement = this.taskEditor.nativeElement.querySelector("[href='task://" + sourceId + "']");
      if (this.taskMap.selected.dependencies) {
        this.taskMap.selected.dependencies.forEach(task => {
          let destId = task;
          var dest: HTMLAnchorElement = this.taskEditor.nativeElement.querySelector("[href='task://" + destId + "']");
          this.link(sourceId, source, destId, dest);
        });
      }
    }

    // Grouping
    this.calculateTasks();

    // Save
    this.save();

  }

  calculateTasks() {
    this.groupedTasks = {};
    this.groupedTopics = {};
    let taskIds = Object.keys(this.taskMap).filter(x => x != 'selected');
    taskIds.forEach(id => {
      let t = this.taskMap[id];
      let owner = t.owner ? t.owner.name : 'Unassigned';
      let group = this.groupedTasks[owner];
      if (!group) {
        group = { tasks: [], totalEffort: 0, nextTasks: 0, blockedTasks: 0 };
        this.groupedTasks[owner] = group;
      }
      group.tasks.push(t);

      let section = t.section ? t.section : 'Unknown topic';
      let topic = this.groupedTopics[section];
      if (!topic) {
        topic = { tasks: [], totalEffort: 0, remainingEffort: 0, nextTasks: 0, blockedTasks: 0, taskers: {} };
        this.groupedTopics[section] = topic;
      }
      topic.tasks.push(t);

      if (t.dependencies) {
        let dependenciesSolved = true;
        t.dependencies.forEach(id => {
          let status = this.taskMap[id].status;
          if (status == 'startable' || status == 'started' || status == 'paused') {
            dependenciesSolved = false;
          }
        });
        t.dependenciesSolved = dependenciesSolved;
      }
    });

    let topicIds = Object.keys(this.groupedTopics);
    topicIds.forEach(id => {
      let t = this.groupedTopics[id];
      t.tasks.forEach(task => {
        t.totalEffort = t.totalEffort + task.effort;
        let status = task.status;
        if (status == 'startable' || status == 'started' || status == 'paused') {
          t.remainingEffort = t.remainingEffort + task.effort;
        }
        if (task.dependenciesSolved) {
          t.nextTasks++;
        } else {
          t.blockedTasks++;
        }
      });
    });

    let groupIds = Object.keys(this.groupedTasks);
    groupIds.forEach(id => {
      this.groupedTasks[id].tasks = this.groupedTasks[id].tasks.filter(x => x.status == 'startable' || x.status == 'started' || x.status == 'paused').sort((a, b) => {
        let dif = b.priority - a.priority;
        return dif;
      });
      if (this.groupedTasks[id].tasks.length == 0) {
        delete this.groupedTasks[id];
      } else {
        let effort = 0;
        let nextTasks = 0;
        let blockedTasks = 0;
        this.groupedTasks[id].tasks.forEach(task => {
          let status = task.status;
          if (status == 'startable' || status == 'started' || status == 'paused') {
            effort = effort + task.effort;
          }
          if (task.dependenciesSolved) {
            nextTasks++;
          } else {
            blockedTasks++;
          }
        });

        this.groupedTasks[id].totalEffort = effort;
        this.groupedTasks[id].nextTasks = nextTasks;
        this.groupedTasks[id].blockedTasks = blockedTasks;
      }

    });
  }

  save() {
    this.saving = true;
    setTimeout(() => {
      let data = {
        editor: this.getValue(),
        taskMap: this.taskMap,
        owners: this.owners
      }
      localStorage.setItem("datas", JSON.stringify(data));
      this.saving = false;
    });
  }

  load() {
    let data = JSON.parse(localStorage.getItem("datas"));
    if (data) {
      if (data.taskMap) {
        this.taskMap = data.taskMap;
      }
      if (data.editor) {
        this.setValue(data.editor)
      }
      if (data.owners) {
        this.owners = data.owners;
      }
      setTimeout(() => {
        this.setupTaskComponent();
        this.calculateTasks();
      });
    }
  }

  getNodeText(element) {
    var text = '';
    for (var i = 0; i < element.childNodes.length; ++i) {
      if (element.childNodes[i].nodeType === Node.TEXT_NODE) {
        text += element.childNodes[i].textContent;
      }
    }
    return text;
  }

  deassignTask() {
    this.execCommand("unlink");
    this.setupTaskComponent();
  }

  generateTaskUUID() {
    var d = new Date().getTime();
    var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if (d > 0) {//Use timestamp until depleted
        r = (d + r) % 16 | 0;
        d = Math.floor(d / 16);
      } else {//Use microseconds since page-load if supported
        r = (d2 + r) % 16 | 0;
        d2 = Math.floor(d2 / 16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  compareOwners(o1: any, o2: any) {
    let email1 = o1 ? o1.email : null;
    let email2 = o2 ? o2.email : null;
    return email1 == email2;
  }

  compareTasks(o1: any, o2: any) {
    let t1 = o1 ? o1.id : null;
    let t2 = o2 ? o2.id : null;
    return t1 == t2;
  }

  unselectTask() {
    this.taskMap.selected = null;
    this.preventSelect = true;
    this.setupTaskComponent(true);
    setTimeout(() => {
      this.preventSelect = false;
    }, 1000);
  }

  sortedDependenciesByTask(task) {
    let tasks = [];
    Object.keys(this.taskMap).forEach(k => {
      if (k != 'selected' && k != task.id) {
        tasks.push(this.taskMap[k]);
      }
    });
    return tasks.sort((a, b) => {
      let diffA = Math.abs(task.position - a.position);
      let diffB = Math.abs(task.position - b.position);
      return diffA - diffB;
    }).slice(0, 30);
  }

  goToTask($event, task) {
    $event.preventDefault();
    let el = document.querySelector("[href='task://" + task.id + "']");
    el.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      this.highlight(el);
    }, 200);
  }

  highlight(element) {
    if (!element.inprogress) {
      element.inprogress = true;
      let defaultBG = element.style.backgroundColor;
      let defaultTransition = element.style.transition;

      element.style.transition = "background 1s";
      element.style.backgroundColor = "#FDFF47";

      setTimeout(function () {
        element.style.backgroundColor = defaultBG;
        setTimeout(function () {
          element.style.transition = defaultTransition;
          element.inprogress = false;
        }, 1000);
      }, 1000);
    }
  }


}
