// Generated from Pele 1.10.0 with additive geometry evidence. See README.md.
// @bun
// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/errors.ts
class PeleError extends Error {
  code;
  type;
  mermaidType;
  line;
  column;
  snippet;
  constructor(message, code = "syntax", info = {}) {
    super(message);
    this.name = "PeleError";
    this.code = code;
    this.type = info.type ?? null;
    this.mermaidType = info.mermaidType ?? null;
    this.line = info.line ?? 0;
    this.column = info.column ?? 0;
    this.snippet = info.snippet ?? "";
  }
}
var origin;
function written(src, offset) {
  return origin !== undefined && src === origin.parsed ? origin.find(offset) : [src, offset];
}
function locate(src, offset) {
  [src, offset] = written(src, offset);
  let line = 1;
  let lineStart = 0;
  for (let i = src.indexOf(`
`);i !== -1 && i < offset; i = src.indexOf(`
`, i + 1)) {
    line++;
    lineStart = i + 1;
  }
  let lineEnd = src.indexOf(`
`, offset);
  if (lineEnd === -1)
    lineEnd = src.length;
  const column = offset - lineStart + 1;
  const text = src.slice(lineStart, lineEnd);
  return { line, column, snippet: text + `
` + "-".repeat(column - 1) + "^" };
}
function syntaxError(type, src, offset, detail, lexical = false) {
  const loc = locate(src, offset);
  const head = lexical ? `Lexical error on line ${loc.line}. Unrecognized text.` : `Parse error on line ${loc.line}:`;
  const message = lexical ? `${head}
${loc.snippet}` : `${head}
${loc.snippet}
${detail}`;
  return new PeleError(message, "syntax", { type, ...loc });
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/architecture/db.ts
function fail(message) {
  throw new PeleError(message, "semantic", { type: "architecture" });
}

class ArchitectureDb {
  type = "architecture";
  title;
  accTitle;
  accDescr;
  nodes = new Map;
  groups = new Map;
  edges = [];
  layoutHints = [];
  registered = new Map;
  register(kind, id, parent) {
    if (this.registered.has(id)) {
      fail(`The ${kind} id [${id}] is already in use by another ${this.registered.get(id)}`);
    }
    if (parent !== undefined) {
      if (id === parent)
        fail(`The ${kind} [${id}] cannot be placed within itself`);
      if (!this.registered.has(parent)) {
        fail(`The ${kind} [${id}]'s parent does not exist. Please make sure the parent is created before this ${kind}`);
      }
      if (this.registered.get(parent) === "node")
        fail(`The ${kind} [${id}]'s parent is not a group`);
    }
    this.registered.set(id, kind === "group" ? "group" : "node");
  }
  addService({ id, icon, iconText, title, in: parent }) {
    this.register("service", id, parent);
    this.nodes.set(id, { id, type: "service", icon, iconText, title, in: parent });
  }
  addJunction({ id, in: parent }) {
    this.register("junction", id, parent);
    this.nodes.set(id, { id, type: "junction", in: parent });
  }
  addGroup({ id, icon, title, in: parent }) {
    this.register("group", id, parent);
    this.groups.set(id, { id, icon, title, in: parent });
  }
  addEdge({ lhsId, rhsId, lhsDir, rhsDir, lhsInto, rhsInto, lhsGroup, rhsGroup, title }) {
    const ends = [
      ["left", lhsId, lhsGroup],
      ["right", rhsId, rhsGroup]
    ];
    for (const [side, id] of ends) {
      if (!this.registered.has(id)) {
        fail(`The ${side}-hand id [${id}] does not yet exist. Please create the service/group before declaring an edge to it.`);
      }
    }
    for (const [side, id] of ends) {
      if (!this.nodes.has(id))
        fail(`The ${side}-hand id [${id}] is a group. Add {group} to a service inside it instead.`);
    }
    const parent = this.nodes.get(lhsId).in;
    if (parent !== undefined && parent === this.nodes.get(rhsId).in) {
      for (const [side, id, crosses] of ends) {
        if (crosses)
          fail(`The ${side}-hand id [${id}] is modified to traverse the group boundary, but the edge does not pass through two groups.`);
      }
    }
    this.edges.push({ lhsId, lhsDir, lhsInto, lhsGroup, rhsId, rhsDir, rhsInto, rhsGroup, title });
  }
  addLayoutHint(hint) {
    if (hint.members.length < 2)
      fail(`An align directive requires at least two members; got ${hint.members.length}`);
    const seen = new Set;
    for (const id of hint.members) {
      if (this.registered.get(id) !== "node") {
        fail(`align ${hint.direction} references [${id}], which is not a service or junction`);
      }
      if (seen.has(id))
        fail(`align ${hint.direction} lists [${id}] more than once`);
      seen.add(id);
    }
    this.layoutHints.push(hint);
  }
}
function populate(ast, db) {
  if (ast.accDescr)
    db.accDescr = ast.accDescr.replace(/\n\s+/g, `
`);
  if (ast.accTitle)
    db.accTitle = ast.accTitle.replace(/^\s+/g, "");
  if (ast.title)
    db.title = ast.title;
  for (const group of ast.groups)
    db.addGroup(group);
  for (const service of ast.services)
    db.addService(service);
  for (const junction of ast.junctions)
    db.addJunction(junction);
  for (const edge of ast.edges)
    db.addEdge(edge);
  for (const alignment of ast.alignments)
    db.addLayoutHint({ direction: alignment.direction, members: [...alignment.members] });
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/common/tokens.ts
var tables = new WeakMap;
function prepare(types) {
  const every = types.map((_, k) => k);
  const starting = [];
  for (let c = 0;c < 128; c++) {
    const ch = String.fromCharCode(c);
    starting.push(every.filter((k) => {
      const { pattern, first } = types[k];
      return typeof pattern === "string" ? pattern[0] === ch : first === undefined || first.includes(ch);
    }));
  }
  const table = { starting, every, longer: types.map((type) => type.longer?.map((alt) => types.indexOf(alt))) };
  tables.set(types, table);
  return table;
}
function tokenize(src, types, diagram) {
  const kinds = [];
  const starts = [];
  const ends = [];
  const dead = new Uint8Array(types.length);
  const { starting, every, longer } = tables.get(types) ?? prepare(types);
  const scanners = [];
  const n = src.length;
  const match = (k, p2) => {
    if (dead[k])
      return -1;
    const type = types[k];
    if (type.match !== undefined)
      return type.match(src, p2);
    if (type.scanner !== undefined)
      return (scanners[k] ??= type.scanner())(src, p2);
    const pattern = type.pattern;
    if (typeof pattern === "string")
      return src.startsWith(pattern, p2) ? p2 + pattern.length : -1;
    pattern.lastIndex = p2;
    if (pattern.test(src))
      return pattern.lastIndex;
    if (type.opener !== undefined) {
      type.opener.lastIndex = p2;
      if (type.opener.test(src))
        dead[k] = 1;
    }
    return -1;
  };
  let p = 0;
  scan:
    while (p < n) {
      const c = src.charCodeAt(p);
      for (const k of c < 128 ? starting[c] : every) {
        let end = match(k, p);
        if (end <= p)
          continue;
        let kind = k;
        const alts = longer[k];
        if (alts !== undefined) {
          for (const alt of alts) {
            const altEnd = match(alt, p);
            if (altEnd > end) {
              kind = alt;
              end = altEnd;
              break;
            }
          }
        }
        if (!types[kind].hidden) {
          kinds.push(kind);
          starts.push(p);
          ends.push(end);
        }
        p = end;
        continue scan;
      }
      throw syntaxError(diagram, src, p, "", true);
    }
  kinds.push(-1);
  starts.push(n);
  ends.push(n);
  return { kinds, starts, ends, src };
}
var ACC_DESCR = {
  name: "ACC_DESCR",
  pattern: /[\t ]*accDescr(?:[\t ]*:([^\n\r]*?(?=%%)|[^\n\r]*)|\s*{([^}]*)})/y,
  first: "\t a"
};
var ACC_TITLE = {
  name: "ACC_TITLE",
  pattern: /[\t ]*accTitle[\t ]*:(?:[^\n\r]*?(?=%%)|[^\n\r]*)/y,
  first: "\t a"
};
var TITLE = {
  name: "TITLE",
  pattern: /[\t ]*title(?:[\t ][^\n\r]*?(?=%%)|[\t ][^\n\r]*|)/y,
  first: "\t t"
};
var STRING = { name: "STRING", pattern: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/y, first: `"'` };
var NEWLINE = { name: "NEWLINE", pattern: /\r?\n/y, first: `\r
` };
var WHITESPACE = { name: "WHITESPACE", pattern: /[\t ]+/y, hidden: true, first: "\t " };
var YAML = {
  name: "YAML",
  pattern: /---[\t ]*\r?\n(?:[\S\s]*?\r?\n)?---(?:\r?\n|(?!\S))/y,
  hidden: true,
  opener: /---[\t ]*\r?\n/y,
  first: "-"
};
var DIRECTIVE = {
  name: "DIRECTIVE",
  pattern: /[\t ]*%%{[\S\s]*?}%%(?:\r?\n|(?!\S))/y,
  hidden: true,
  opener: /[\t ]*%%{/y,
  first: "\t %"
};
var SINGLE_LINE_COMMENT = {
  name: "SINGLE_LINE_COMMENT",
  pattern: /[\t ]*%%[^\n\r]*/y,
  first: "\t %",
  hidden: true
};
var RE_ACC_DESCR = /accDescr(?:[\t ]*:([^\n\r]*)|\s*{([^}]*)})/;
var RE_ACC_TITLE = /accTitle[\t ]*:([^\n\r]*)/;
var RE_TITLE = /title([\t ][^\n\r]*|)/;
function single(text) {
  return text.trim().replace(/[\t ]{2,}/gm, " ");
}
function titleValue(text) {
  return single(RE_TITLE.exec(text)[1]);
}
function accTitleValue(text) {
  return single(RE_ACC_TITLE.exec(text)[1]);
}
function accDescrValue(text) {
  const m = RE_ACC_DESCR.exec(text);
  if (m[1] !== undefined)
    return single(m[1]);
  return m[2].replace(/^\s*/gm, "").replace(/\s+$/gm, "").replace(/[\t ]{2,}/gm, " ").replace(/[\n\r]{2,}/gm, `
`);
}
var ESCAPES = new Map([
  ["b", "\b"],
  ["f", "\f"],
  ["n", `
`],
  ["r", "\r"],
  ["t", "\t"],
  ["v", "\v"],
  ["0", "\x00"]
]);
function stringValue(text) {
  if (!text.includes("\\"))
    return text.slice(1, -1);
  let out = "";
  for (let i = 1;i < text.length - 1; i++) {
    const c = text[i];
    if (c === "\\") {
      const next = text[++i];
      out += ESCAPES.get(next) ?? next;
    } else {
      out += c;
    }
  }
  return out;
}

class Reader {
  tokens;
  types;
  diagram;
  i = 0;
  kinds;
  constructor(tokens, types, diagram) {
    this.tokens = tokens;
    this.types = types;
    this.diagram = diagram;
    this.kinds = tokens.kinds;
  }
  get kind() {
    return this.kinds[this.i];
  }
  text(index = this.i) {
    return this.tokens.src.slice(this.tokens.starts[index], this.tokens.ends[index]);
  }
  take() {
    return this.text(this.i++);
  }
  accept(kind) {
    if (this.kinds[this.i] !== kind)
      return false;
    this.i++;
    return true;
  }
  expect(kind) {
    if (this.kinds[this.i] !== kind)
      this.fail(`token of type '${this.types[kind].name}'`);
    return this.take();
  }
  fail(expected) {
    const found = this.kind === -1 ? "end of input" : `\`${this.text()}\``;
    throw syntaxError(this.diagram, this.tokens.src, this.tokens.starts[this.i], `Expecting ${expected} but found ${found}.`);
  }
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/architecture/parser.ts
var ID = { name: "ID", pattern: /[\w]([-\w]*\w)?/y };
function word(text) {
  return { name: text, pattern: text, longer: [ID] };
}
var ARCHITECTURE_TOKENS = [
  word("architecture-beta"),
  word("junction"),
  word("service"),
  word("column"),
  word("group"),
  word("align"),
  word("row"),
  { name: "--", pattern: "--", longer: [YAML] },
  word("in"),
  { name: ":", pattern: ":" },
  { name: "-", pattern: "-", longer: [YAML] },
  { name: "ARROW_DIRECTION", pattern: /L|R|T|B/y },
  { name: "ARROW_GROUP", pattern: /\{group\}/y },
  { name: "ARROW_INTO", pattern: /<|>/y },
  ACC_DESCR,
  ACC_TITLE,
  TITLE,
  STRING,
  ID,
  NEWLINE,
  WHITESPACE,
  YAML,
  DIRECTIVE,
  SINGLE_LINE_COMMENT,
  { name: "ARCH_ICON", pattern: /\([\w-:]+\)/y },
  { name: "ARCH_TITLE", pattern: /\[(?:"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|[^\[\]\r\n]+)\]/y }
];
function labelValue(text) {
  let result = text.slice(1, -1).trim();
  if (result.startsWith('"') && result.endsWith('"') || result.startsWith("'") && result.endsWith("'")) {
    result = result.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return result.trim();
}
function parseArchitecture(src) {
  const r = new Reader(tokenize(src, ARCHITECTURE_TOKENS, "architecture"), ARCHITECTURE_TOKENS, "architecture");
  const ast = { $type: "Architecture", groups: [], services: [], junctions: [], edges: [], alignments: [] };
  const is = (kind) => r.kinds[r.i] === kind;
  const endOfLine = () => {
    if (r.kind === -1)
      return;
    if (r.kind !== 19 /* newline */)
      r.fail("a line break or the end of input");
    while (r.kind === 19 /* newline */)
      r.i++;
  };
  while (r.kind === 19 /* newline */)
    r.i++;
  r.expect(0 /* header */);
  while (r.kind !== -1) {
    switch (r.kind) {
      case 19 /* newline */:
        r.i++;
        continue;
      case 14 /* accDescr */:
        ast.accDescr = accDescrValue(r.take());
        break;
      case 15 /* accTitle */:
        ast.accTitle = accTitleValue(r.take());
        break;
      case 16 /* title */:
        ast.title = titleValue(r.take());
        break;
      case 4 /* group */: {
        r.i++;
        const group = { $type: "Group", id: r.expect(18 /* id */) };
        if (is(24 /* icon */))
          group.icon = r.take().slice(1, -1);
        if (is(25 /* label */))
          group.title = labelValue(r.take());
        if (r.accept(8 /* in */))
          group.in = r.expect(18 /* id */);
        ast.groups.push(group);
        break;
      }
      case 2 /* service */: {
        r.i++;
        const service = { $type: "Service", id: r.expect(18 /* id */) };
        if (is(17 /* string */))
          service.iconText = stringValue(r.take());
        else if (is(24 /* icon */))
          service.icon = r.take().slice(1, -1);
        if (is(25 /* label */))
          service.title = labelValue(r.take());
        if (r.accept(8 /* in */))
          service.in = r.expect(18 /* id */);
        ast.services.push(service);
        break;
      }
      case 1 /* junction */: {
        r.i++;
        const junction = { $type: "Junction", id: r.expect(18 /* id */) };
        if (r.accept(8 /* in */))
          junction.in = r.expect(18 /* id */);
        ast.junctions.push(junction);
        break;
      }
      case 18 /* id */: {
        const lhsId = r.take();
        const lhsGroup = r.accept(12 /* arrowGroup */);
        r.expect(9 /* colon */);
        const lhsDir = r.expect(11 /* direction */);
        const lhsInto = r.accept(13 /* into */);
        let title;
        if (!r.accept(7 /* dashes */)) {
          if (!is(10 /* dash */))
            r.fail("'--' or '-'");
          r.i++;
          title = labelValue(r.expect(25 /* label */));
          r.expect(10 /* dash */);
        }
        const rhsInto = r.accept(13 /* into */);
        const rhsDir = r.expect(11 /* direction */);
        r.expect(9 /* colon */);
        const rhsId = r.expect(18 /* id */);
        const rhsGroup = r.accept(12 /* arrowGroup */);
        ast.edges.push({ $type: "Edge", lhsId, lhsGroup, lhsDir, lhsInto, title, rhsInto, rhsDir, rhsId, rhsGroup });
        break;
      }
      case 5 /* align */: {
        r.i++;
        if (!is(6 /* row */) && !is(3 /* column */))
          r.fail("'row' or 'column'");
        const direction = r.take();
        const members = [r.expect(18 /* id */), r.expect(18 /* id */)];
        while (is(18 /* id */))
          members.push(r.take());
        ast.alignments.push({ $type: "Alignment", direction, members });
        break;
      }
      default:
        r.fail("a group, a service, a junction, an edge, an alignment, a title, or a line break");
    }
    endOfLine();
  }
  return ast;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/common/fit-width.ts
function titleRoom(options) {
  const available = options.maxWidth;
  return available !== undefined && available > 0 ? Math.max(80, available - 2 * (options.padding ?? 8)) : 4000;
}
function tighten(options, draw) {
  const loose = draw(false);
  const available = options.maxWidth;
  if (available === undefined || !(available > 0) || loose.width <= available)
    return loose;
  const tight = draw(true);
  return tight.width < loose.width ? tight : loose;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/text/entities.ts
var NAMED = "amp:38,lt:60,gt:62,quot:34,apos:39,nbsp:160,shy:173,iexcl:161,cent:162,pound:163,curren:164,yen:165,sect:167," + "copy:169,laquo:171,not:172,reg:174,deg:176,plusmn:177,sup2:178,sup3:179,micro:181,para:182,middot:183," + "sup1:185,raquo:187,frac14:188,frac12:189,frac34:190,iquest:191,times:215,divide:247,ndash:8211,mdash:8212," + "lsquo:8216,rsquo:8217,sbquo:8218,ldquo:8220,rdquo:8221,bdquo:8222,dagger:8224,Dagger:8225,bull:8226," + "hellip:8230,permil:8240,prime:8242,Prime:8243,lsaquo:8249,rsaquo:8250,euro:8364,trade:8482,larr:8592," + "uarr:8593,rarr:8594,darr:8595,harr:8596,lArr:8656,uArr:8657,rArr:8658,dArr:8659,hArr:8660,forall:8704," + "part:8706,exist:8707,empty:8709,nabla:8711,isin:8712,notin:8713,ni:8715,prod:8719,sum:8721,minus:8722," + "radic:8730,infin:8734,and:8743,or:8744,cap:8745,cup:8746,int:8747,there4:8756,sim:8764,cong:8773," + "asymp:8776,ne:8800,equiv:8801,le:8804,ge:8805,sub:8834,sup:8835,sube:8838,supe:8839,oplus:8853,otimes:8855," + "perp:8869,sdot:8901,loz:9674,spades:9824,clubs:9827,hearts:9829,diams:9830,check:10003,cross:10007," + "AMP:38,LT:60,GT:62,QUOT:34,lsqb:91,rsqb:93,lcub:123,rcub:125,verbar:124,VerticalLine:124,midast:42," + "DiacriticalGrave:96,Hat:94,UnderBar:95," + "equals:61,colon:58,semi:59,num:35,percnt:37,lpar:40,rpar:41,lbrack:91,rbrack:93,lbrace:123,rbrace:125," + "vert:124,sol:47,bsol:92,quest:63,excl:33,ast:42,plus:43,comma:44,period:46,dollar:36,commat:64,grave:96," + "hat:94,lowbar:95,tilde:126,Alpha:913,Beta:914,Gamma:915,Delta:916,Epsilon:917,Zeta:918,Eta:919,Theta:920," + "Iota:921,Kappa:922,Lambda:923,Mu:924,Nu:925,Xi:926,Omicron:927,Pi:928,Rho:929,Sigma:931,Tau:932," + "Upsilon:933,Phi:934,Chi:935,Psi:936,Omega:937,alpha:945,beta:946,gamma:947,delta:948,epsilon:949,zeta:950," + "eta:951,theta:952,iota:953,kappa:954,lambda:955,mu:956,nu:957,xi:958,omicron:959,pi:960,rho:961,sigmaf:962," + "sigma:963,tau:964,upsilon:965,phi:966,chi:967,psi:968,omega:969";
var named;
function lookup(name) {
  if (!named) {
    named = new Map;
    for (const pair of NAMED.split(",")) {
      const at = pair.indexOf(":");
      named.set(pair.slice(0, at), String.fromCodePoint(Number(pair.slice(at + 1))));
    }
  }
  return named.get(name);
}
function codePoint(n, fallback) {
  return n > 0 && n <= 1114111 && (n < 55296 || n > 57343) ? String.fromCodePoint(n) : fallback;
}
var RE_ENTITY = /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|(\w+));/g;
var OPEN = "\uFB02\xB0";
var CLOSE = "\xB6\xDF";
function restorePlaceholders(text) {
  let out = "";
  let last = 0;
  let from = text.indexOf(OPEN);
  while (from !== -1) {
    const stop = text.indexOf("\xB6", from + 2);
    if (stop === -1)
      break;
    if (text[stop + 1] === "\xDF") {
      const numeric = text[from + 2] === "\xB0";
      out += text.slice(last, from) + (numeric ? "&#" : "&") + text.slice(from + (numeric ? 3 : 2), stop) + ";";
      last = stop + 2;
    }
    from = text.indexOf(OPEN, stop + 1);
  }
  return last === 0 ? text : out + text.slice(last);
}
function decodeEntities(text) {
  if (text.includes(CLOSE))
    text = restorePlaceholders(text);
  if (text.includes("&")) {
    text = text.replace(RE_ENTITY, (m, dec, hex, name) => {
      if (dec)
        return codePoint(Number(dec), m);
      if (hex)
        return codePoint(parseInt(hex, 16), m);
      return lookup(name) ?? m;
    });
  }
  return text;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/text/metrics.ts
var REGULAR = "7q7q9vfgfgopij5b9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg7q7qg8g8g8fgs7ijijk2k2ijgzlmk27qdwijfgn5k2lmijlmk2ijgzk2ijq8ijijgz7q7q7qd1fg99fgfgdwfgfg7qfgfg6666dw66n5fgfgfgfg99dw7qfgdwk2dwdwdw9a789ag8";
var BOLD = "7q99d6fgfgopk26m9999atg87q997q7qfgfgfgfgfgfgfgfgfgfg9999g8g8g8gzr3k2k2k2k2ijgzlmk27qfgk2gzn5k2lmijlmk2ijgzk2ijq8ijijgz997q99g8fg99fggzfggzfg99gzgz7q7qfg7qopgzgzgzgzatfg99gzfglmfgfgdwat7satg8";

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/text/measurer.ts
var SMALLER = 1.2;
function unpack(packed) {
  const out = new Uint16Array(95);
  for (let i = 0;i < 95; i++)
    out[i] = parseInt(packed.substr(i * 2, 2), 36);
  return out;
}
var regular;
var bold;
function isWide(c) {
  return c >= 4352 && c <= 4447 || c >= 11904 && c <= 42191 || c >= 44032 && c <= 55203 || c >= 63744 && c <= 64255 || c >= 65072 && c <= 65103 || c >= 65280 && c <= 65376 || c >= 65504 && c <= 65510 || c >= 55296 && c <= 56319;
}
function isZeroWidth(c) {
  return c === 173 || c >= 768 && c <= 879 || c >= 8203 && c <= 8207 || c >= 56320 && c <= 57343 || c >= 65024 && c <= 65039 || c === 65279;
}
var metricsMeasurer = {
  width(text, size, style) {
    const mono = (style & 4 /* Mono */) !== 0;
    const eff = style & (8 /* Sub */ | 16 /* Sup */) ? size / SMALLER : size;
    const table = style & 1 /* Bold */ ? bold ??= unpack(BOLD) : regular ??= unpack(REGULAR);
    let units = 0;
    for (let i = 0;i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c < 32)
        continue;
      if (c < 127)
        units += mono ? 600 : table[c - 32];
      else if (isZeroWidth(c))
        continue;
      else if (isWide(c))
        units += mono ? 1200 : 1000;
      else
        units += mono ? 600 : 580;
    }
    return units * eff / 1000;
  }
};
function context() {
  const g = globalThis;
  try {
    if (g.OffscreenCanvas)
      return new g.OffscreenCanvas(1, 1).getContext("2d");
    if (g.document)
      return g.document.createElement("canvas").getContext("2d");
  } catch {
    return null;
  }
  return null;
}
var MAX_CACHED = 20000;
function canvasFonts() {
  const g = globalThis;
  return g.document?.fonts ?? g.fonts;
}
function hasFont(fonts, font, text) {
  try {
    return fonts?.check(font, text) ?? true;
  } catch {
    return true;
  }
}
function canvasMeasurer(fontFamily, monoFamily = "monospace") {
  const ctx = context();
  if (!ctx)
    return null;
  const caches = new Map;
  let currentFont = "";
  let faces = canvasFonts()?.size;
  return {
    width(text, size, style) {
      const fonts = canvasFonts();
      if (fonts?.size !== faces) {
        faces = fonts?.size;
        caches.clear();
      }
      const eff = style & (8 /* Sub */ | 16 /* Sup */) ? size / SMALLER : size;
      const font = (style & 2 /* Italic */ ? "italic " : "") + (style & 1 /* Bold */ ? "bold " : "") + eff + "px " + (style & 4 /* Mono */ ? monoFamily : fontFamily);
      let cache = caches.get(font);
      if (!cache)
        caches.set(font, cache = new Map);
      let w = cache.get(text);
      if (w === undefined) {
        if (font !== currentFont)
          ctx.font = currentFont = font;
        w = ctx.measureText(text).width;
        if (hasFont(fonts, font, text)) {
          if (cache.size >= MAX_CACHED)
            cache.clear();
          cache.set(text, w);
        }
      }
      return w;
    }
  };
}
var shared = new Map;
function defaultMeasurer(fontFamily = "sans-serif", monoFamily = "monospace") {
  const key = fontFamily + `
` + monoFamily;
  let m = shared.get(key);
  if (!m) {
    m = canvasMeasurer(fontFamily, monoFamily) ?? metricsMeasurer;
    shared.set(key, m);
  }
  return m;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/svg/builder.ts
var RE_NEEDS_ESC = /[&<>"\x00-\x08\x0b\x0c\x0e-\x1f\x7f\ud800-\udfff\ufffe\uffff]/u;
var RE_ESC = /[&<>"]|[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\ud800-\udfff\ufffe\uffff]+/gu;
var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
function esc(text) {
  return RE_NEEDS_ESC.test(text) ? text.replace(RE_ESC, (c) => ESC[c] ?? "") : text;
}
function escText(text) {
  return esc(decodeEntities(text));
}
var FRACTION = [];
for (let i = 0;i < 100; i++)
  FRACTION.push(i === 0 ? "" : i % 10 === 0 ? "." + i / 10 : "." + (i < 10 ? "0" + i : i));
function num(value) {
  const n = Math.round(value * 100);
  if (n === 0)
    return "0";
  if (n > 0) {
    if (n < 100000000000) {
      const q = Math.floor(n / 100);
      return q + FRACTION[n - q * 100];
    }
  } else if (n > -100000000000) {
    const m = -n;
    const q = Math.floor(m / 100);
    return "-" + q + FRACTION[m - q * 100];
  }
  return String(n / 100);
}
function labelSvg(label, cx, cy, attrs, icons) {
  const lines = label.lines;
  if (lines.length === 0)
    return "";
  const lh = label.lineHeight;
  const heights = label.heights;
  const shift = label.size * 0.35;
  let top = cy - label.height / 2;
  const only = lines.length === 1 && lines[0].length === 1 ? lines[0][0] : undefined;
  if (only && only.icon === undefined && only.math === undefined && only.style === 0) {
    return `<text${attrs} x="${num(cx)}" y="${num(top + lh / 2 + shift)}" text-anchor="middle">${esc(only.text)}</text>`;
  }
  const shared2 = sharedStyle(label);
  const given = attrs;
  let math;
  attrs = textStyle(attrs, shared2);
  let body = "";
  let extra = "";
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const h = heights ? heights[i] : lh;
    const mid = top + h / 2;
    const y = mid + shift;
    let placed = false;
    for (const span of line)
      if (span.icon !== undefined || span.math)
        placed = true;
    if (placed) {
      let x = cx - label.widths[i] / 2;
      for (const span of line) {
        if (span.math) {
          const box = `x="${num(x)}" y="${num(mid - span.math.height / 2)}" width="${num(span.math.width)}" height="${num(span.math.height)}"`;
          math ??= mathLook(given);
          extra += math.halo === undefined ? mathSvg(span.math, box, label.size, math.attrs) : `<rect ${box} rx="2" fill="${math.halo}"/>`;
        } else if (span.icon !== undefined) {
          const side = label.size * 1.1;
          const inner = icons?.(span.icon) ?? "";
          extra += `<svg class="pele-icon" data-icon="${escText(span.icon)}" x="${num(x)}" y="${num(mid - side / 2)}" width="${num(side)}" height="${num(side)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
        } else if (span.text !== "") {
          body += `<tspan x="${num(x)}" y="${num(y)}" text-anchor="start"${spanStyle(span.style & ~shared2)}>${esc(span.text)}</tspan>`;
        }
        x += span.width;
      }
    } else {
      for (let j = 0;j < line.length; j++) {
        const span = line[j];
        const pos = j === 0 ? ` x="${num(cx)}" y="${num(y)}"` : "";
        body += `<tspan${pos}${spanStyle(span.style & ~shared2)}>${esc(span.text)}</tspan>`;
      }
      if (line.length === 0)
        body += `<tspan x="${num(cx)}" y="${num(y)}"> </tspan>`;
    }
    top += h;
  }
  return `<text${attrs} text-anchor="middle" xml:space="preserve">${body}</text>${extra}`;
}
var RE_FILL = / fill="([^"]*)"/;
var RE_STROKE = / stroke="([^"]*)"/;
var RE_STYLE = / style="([^"]*)"/;
var RE_STYLE_FILL = /(?:^|;)\s*fill:([^;]*)/;
var RE_STYLE_OPACITY = /(?:^|;)\s*opacity:([^;]*)/;
function mathLook(attrs) {
  const style = RE_STYLE.exec(attrs)?.[1] ?? "";
  const fill = (RE_STYLE_FILL.exec(style)?.[1] ?? RE_FILL.exec(attrs)?.[1] ?? "").trim();
  if (fill === "none")
    return { attrs: "", halo: RE_STROKE.exec(attrs)?.[1] ?? "none" };
  const opacity = RE_STYLE_OPACITY.exec(style)?.[1].trim();
  return { attrs: (fill === "" ? "" : ` color="${fill}"`) + (opacity ? ` opacity="${opacity}"` : "") };
}
function mathSvg(math, box, size, attrs) {
  if ("svg" in math)
    return `<svg class="pele-math" ${box} overflow="visible"${attrs}>${math.svg}</svg>`;
  return `<foreignObject class="pele-math" ${box} overflow="visible"${attrs}>` + `<div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:${num(size)}px;line-height:normal;white-space:nowrap">${math.html}</div>` + "</foreignObject>";
}
var BOLD2 = ' font-weight="var(--_w)"';
var ITALIC = ' font-style="italic"';
var UNDERLINE = ' text-decoration="underline"';
var MONO = ' font-family="var(--_fm)"';
var SUB = ' baseline-shift="sub" font-size="smaller"';
var SUP = ' baseline-shift="super" font-size="smaller"';
function spanStyle(style) {
  return (style & 1 /* Bold */ ? BOLD2 : "") + (style & 2 /* Italic */ ? ITALIC : "") + (style & 4 /* Mono */ ? MONO : "") + (style & 32 /* Underline */ ? UNDERLINE : "") + (style & 8 /* Sub */ ? SUB : style & 16 /* Sup */ ? SUP : "");
}
function sharedStyle(label) {
  let shared2 = 1 /* Bold */ | 2 /* Italic */ | 4 /* Mono */;
  let any = false;
  for (const line of label.lines) {
    for (const span of line) {
      if (span.icon !== undefined || span.text === "")
        continue;
      shared2 &= span.style;
      any = true;
    }
  }
  return any ? shared2 : 0;
}
function textStyle(attrs, shared2) {
  return attrs + (shared2 & 1 /* Bold */ && !attrs.includes(' font-weight="') ? BOLD2 : "") + (shared2 & 2 /* Italic */ && !attrs.includes(' font-style="') ? ITALIC : "") + (shared2 & 4 /* Mono */ && !attrs.includes(' font-family="') ? MONO : "");
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/layout/layered.ts
var SAMPLES = 16;
var LINE_A = new Float64Array(2 * SAMPLES + 2);
var LINE_B = new Float64Array(2 * SAMPLES + 2);

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/svg/edges.ts
var ARROW = 8;
function markerTrim(type) {
  return type === "arrow_point" ? ARROW - 1 : type === "arrow_circle" ? ARROW : type === "arrow_cross" ? 4 : 0;
}
function marker(type, x, y, dx, dy, color) {
  const nx = -dy;
  const ny = dx;
  if (type === "arrow_point") {
    const bx = x - dx * ARROW;
    const by = y - dy * ARROW;
    const half = ARROW * 0.42;
    return `<path class="pele-marker" d="M${num(x)},${num(y)}L${num(bx + nx * half)},${num(by + ny * half)}L${num(bx - nx * half)},${num(by - ny * half)}Z" fill="${color}" stroke="none"/>`;
  }
  if (type === "arrow_circle") {
    return `<circle class="pele-marker" cx="${num(x - dx * 4)}" cy="${num(y - dy * 4)}" r="3.5" fill="${color}" stroke="none"/>`;
  }
  if (type === "arrow_cross") {
    const cx = x - dx * 4;
    const cy = y - dy * 4;
    const a = 3.5;
    const ux = (dx + nx) * a;
    const uy = (dy + ny) * a;
    const vx = (dx - nx) * a;
    const vy = (dy - ny) * a;
    return `<path class="pele-marker" d="M${num(cx - ux)},${num(cy - uy)}L${num(cx + ux)},${num(cy + uy)}M${num(cx - vx)},${num(cy - vy)}L${num(cx + vx)},${num(cy + vy)}"/>`;
  }
  return "";
}
function edgeLabelSvg(id, label, x, y, attrs, icons) {
  const w = label.width + 8;
  const h = label.height;
  return `<g class="pele-edge-label" data-id="${escText(id)}">` + `<rect x="${num(x - w / 2)}" y="${num(y - h / 2)}" width="${num(w)}" height="${num(h)}" rx="3" fill="var(--_bg)"/>` + labelSvg(label, x, y, attrs, icons) + "</g>";
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/svg/theme.ts
var ROOT_STYLE = "--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);" + "--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);" + "--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg)";
var RADIUS = "var(--pele-radius,4px)";
var ROUNDED = ' style="rx:var(--_r)"';
var FAMILY = String.raw`(?:"[^"'\\\n<>{}();:@]*"|'[^"'\\\n<>{}();:@]*'|[\p{L}\p{N}_-][\p{L}\p{N}_ .-]*)`;
var RE_FAMILIES = new RegExp(String.raw`^\s*${FAMILY}(?:\s*,\s*${FAMILY})*\s*$`, "u");
function families(list, generic) {
  return list && RE_FAMILIES.test(list) ? list : generic;
}
function fontStyle(size, family, mono) {
  return `;--_fm:var(--pele-font-mono,${families(mono, "monospace")});font:${size}px sans-serif;` + "letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;" + `font-family:var(--pele-font,${families(family, "sans-serif")})`;
}
var SHAPE_PROPS = new Set([
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "opacity",
  "rx",
  "ry"
]);
var TEXT_PROPS = new Set([
  "color",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-decoration",
  "letter-spacing",
  "word-spacing",
  "opacity"
]);

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/svg/root.ts
var WEIGHTS = [
  ["tw", "title"],
  ["hw", "heading"],
  ["w", "bold"]
];
var RE_USED = /var\(--_(r|tw|hw|w)\)/g;
function svgDocument(type, width, height, fontSize, options, acc, content) {
  const prefix = esc(options.idPrefix ?? "pele");
  let head = "";
  let aria = "";
  if (acc.accTitle) {
    head += `<title id="${prefix}-title">${escText(acc.accTitle)}</title>`;
    aria += ` aria-labelledby="${prefix}-title"`;
  }
  if (acc.accDescr) {
    head += `<desc id="${prefix}-desc">${escText(acc.accDescr)}</desc>`;
    aria += ` aria-describedby="${prefix}-desc"`;
  }
  const fit = options.responsive === false ? "" : "max-width:100%;height:auto;";
  const used = new Set;
  for (const [, name] of content.matchAll(RE_USED)) {
    used.add(name);
    if (used.size === 4)
      break;
  }
  let weights = used.has("r") ? `;--_r:${RADIUS}` : "";
  for (const [alias, name] of WEIGHTS) {
    if (used.has(alias))
      weights += `;--_${alias}:var(--pele-${name}-weight,bold)`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="pele pele-${type}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="${fit}${ROOT_STYLE}${weights}${esc(fontStyle(fontSize, options.fontFamily, options.fontFamilyMono))}" fill="var(--_fg)" role="graphics-document document" aria-roledescription="${type}"${aria}>` + head + content + "</svg>";
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/text/icons.ts
var resolver;
var found = new Map;
function iconMarkup(name) {
  if (resolver === undefined)
    return "";
  let markup = found.get(name);
  if (markup === undefined) {
    markup = resolver(name) ?? "";
    found.set(name, markup);
  }
  return markup;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/text/math.ts
var resolver2;
var found2 = new Map;
function mathActive() {
  return resolver2 !== undefined;
}
function valid(size) {
  return Number.isFinite(size) && size > 0;
}
function typeset(tex, size) {
  if (resolver2 === undefined)
    return;
  const key = size + `
` + tex;
  if (found2.has(key))
    return found2.get(key);
  const result = resolver2(tex, size) ?? undefined;
  const markup = result && valid(result.width) && valid(result.height) && typeof ("svg" in result ? result.svg : result.html) === "string" ? result : undefined;
  found2.set(key, markup);
  return markup;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/text/label.ts
var LINE_HEIGHT = 1.5;
var WRAPPED_LINE_HEIGHT = 1.3;
var RE_BREAK = /<br\s*\/?>|\\n|\n/gi;
var RE_TAG = /<\/?([a-zA-Z][\w-]*)(?:\s[^<>]*)?\/?>/y;
var RE_ICON = /(fa[bklrs]?):fa-([\w-]+)/g;
var RE_MARKUP = /[<\\\n*_]|fa[bklrs]?:fa-/;
var TAG_STYLES = new Map([
  ["b", 1 /* Bold */],
  ["strong", 1 /* Bold */],
  ["i", 2 /* Italic */],
  ["em", 2 /* Italic */],
  ["cite", 2 /* Italic */],
  ["dfn", 2 /* Italic */],
  ["var", 2 /* Italic */],
  ["code", 4 /* Mono */],
  ["kbd", 4 /* Mono */],
  ["samp", 4 /* Mono */],
  ["tt", 4 /* Mono */],
  ["sub", 8 /* Sub */],
  ["sup", 16 /* Sup */],
  ["u", 32 /* Underline */],
  ["ins", 32 /* Underline */]
]);
var SHIFT = 8 /* Sub */ | 16 /* Sup */;
var HTML_TAGS = new Set(("a abbr address article aside audio b bdi bdo big blockquote body br button caption center cite code col " + "colgroup data dd del details dfn dialog div dl dt em embed fieldset figcaption figure font footer form h1 h2 " + "h3 h4 h5 h6 head header hr html i iframe img input ins kbd label legend li link main map mark meta meter nav " + "noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script section select " + "small source span strike strong style sub summary sup table tbody td template textarea tfoot th thead time " + "title tr track tt u ul var video wbr").split(" "));
var CJK = "\\u2e80-\\u9fff\\uf900-\\ufaff\\uff00-\\uff60";
var CLOSE2 = "\u3001\u3002\uFF0C\uFF0E\uFF1A\uFF1B\uFF01\uFF1F\uFF09\uFF3D\uFF5D\u300D\u300F\u3011\u3015\u3009\u300B\u3019\u3017\u30FC\u2026\u2025\u30FB\u309D\u309E\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308E\u30A1\u30A3\u30A5\u30A7\u30A9\u30C3\u30E3\u30E5\u30E7\u30EE,.:;!?)\\]}";
var OPEN2 = "\uFF08\uFF3B\uFF5B\u300C\u300E\u3010\u3014\u3008\u300A\u3018\u3016([{";
var RE_CJK = new RegExp(`[${CJK}]`);
var HINT = "\\u200b\\u00ad";
var RE_HINT = new RegExp(`[${HINT}]`);
var RE_PIECE = new RegExp(`\\s*(?:[${OPEN2}]*[${CJK}][${CLOSE2}]*|[^\\s${CJK}${HINT}]+[${HINT}]*[${CLOSE2}]*|[${HINT}]+)\\s*|\\s+`, "g");
var MARK = 57344;
var MAX_MARKS = 6400;
var RE_MATH = /\$\$(.+?)\$\$/g;
var RE_MARK = /[\ue000-\uf8ff]/;
var RE_MARKS = /([\ue000-\uf8ff])/;
var marks;
var EMPTY = { lines: [], widths: [], width: 0, height: 0, size: 0, lineHeight: 0 };
function dedent(text) {
  const lines = text.split(`
`);
  let min = Infinity;
  for (const line of lines) {
    if (line.trim() === "")
      continue;
    const indent = line.length - line.trimStart().length;
    if (indent < min)
      min = indent;
  }
  if (min === Infinity || min === 0)
    return text;
  return lines.map((line) => line.slice(Math.min(min, line.length - line.trimStart().length))).join(`
`);
}
function plain(span) {
  return span !== undefined && span.icon === undefined && span.math === undefined;
}
function pushText(line, text, style) {
  if (text === "")
    return;
  if (marks !== undefined && RE_MARK.test(text)) {
    const found3 = marks;
    const parts = text.split(RE_MARKS);
    for (let i = 0;i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i] !== "")
          pushPlain(line, parts[i], style);
        continue;
      }
      const at = parts[i].charCodeAt(0) - MARK;
      const math = found3.math[at];
      if (math)
        line.push({ text: "", style, math, width: math.width });
      else
        pushPlain(line, `$$${found3.tex[at]}$$`, style);
    }
    return;
  }
  pushPlain(line, text, style);
}
function pushPlain(line, text, style) {
  const decoded = decodeEntities(text);
  const last = line[line.length - 1];
  if (plain(last) && last.style === style)
    last.text += decoded;
  else
    line.push({ text: decoded, style, width: 0 });
}
function pushIcons(line, text, style) {
  if (!text.includes(":fa-")) {
    pushText(line, text, style);
    return;
  }
  let last = 0;
  RE_ICON.lastIndex = 0;
  let m;
  while ((m = RE_ICON.exec(text)) !== null) {
    const icon = `${m[1]}:fa-${m[2]}`;
    pushText(line, text.slice(last, m.index), style);
    last = m.index + m[0].length;
    if (iconMarkup(icon) !== "") {
      line.push({ text: "", style, icon, width: 0 });
    } else if (text[last] === " ") {
      last++;
    } else if (last === text.length) {
      const before = line[line.length - 1];
      if (plain(before))
        before.text = before.text.trimEnd();
    }
  }
  pushText(line, text.slice(last), style);
}
function inline(line, source, markdown, base, open) {
  let style = open.style;
  let marked = 0;
  let text = "";
  let i = 0;
  const n = source.length;
  const flush = () => {
    pushIcons(line, text, style | (open.shifts[open.shifts.length - 1] ?? 0));
    text = "";
  };
  while (i < n) {
    const ch = source[i];
    if (ch === "<") {
      RE_TAG.lastIndex = i;
      const m = RE_TAG.exec(source);
      if (m && m.index === i) {
        const tag = m[1].toLowerCase();
        const closing = source[i + 1] === "/";
        const bit = TAG_STYLES.get(tag) ?? 0;
        if (bit & SHIFT) {
          flush();
          const at = open.shifts.lastIndexOf(bit);
          if (!closing)
            open.shifts.push(bit);
          else if (at !== -1)
            open.shifts.splice(at, 1);
        } else if (bit) {
          flush();
          open.style = closing ? open.style & ~bit | base & bit : open.style | bit;
          style = closing ? style & ~bit | base & bit : style | bit;
        }
        if (bit || HTML_TAGS.has(tag)) {
          i += m[0].length;
          continue;
        }
      }
    } else if (markdown && (ch === "*" || ch === "_")) {
      const double = source[i + 1] === ch;
      const bit = double ? 1 /* Bold */ : 2 /* Italic */;
      const len = double ? 2 : 1;
      const open2 = (marked & bit) === 0;
      const prev = i > 0 ? source[i - 1] : " ";
      const next = i + len < n ? source[i + len] : " ";
      const canOpen = open2 && next.trim() !== "" && source.indexOf(double ? ch + ch : ch, i + len) !== -1;
      const canClose = !open2 && prev.trim() !== "";
      const wordy = ch === "_" && /\w/.test(prev) && /\w/.test(next);
      if ((canOpen || canClose) && !wordy) {
        flush();
        marked = canOpen ? marked | bit : marked & ~bit;
        style = canOpen ? style | bit : style & ~bit | base & bit;
        i += len;
        continue;
      }
    }
    text += ch;
    i++;
  }
  flush();
}
function measureSpans(line, measurer, size) {
  let total = 0;
  for (const span of line) {
    span.width = span.icon !== undefined ? size * 1.25 : span.math ? span.math.width : measurer.width(span.text, size, span.style);
    total += span.width;
  }
  return total;
}
function wrap(line, measurer, size, max, out, widths) {
  let current = [];
  let width = 0;
  const commit = (hyphen = false) => {
    const last = current[current.length - 1];
    if (plain(last)) {
      let trimmed = last.text.trimEnd();
      if (hyphen && last.text.endsWith("\xAD"))
        trimmed = trimmed.slice(0, -1) + "-";
      if (trimmed !== last.text) {
        last.text = trimmed;
        const w = measurer.width(trimmed, size, last.style);
        width += w - last.width;
        last.width = w;
      }
    }
    out.push(current);
    widths.push(width);
    current = [];
    width = 0;
  };
  for (const span of line) {
    if (span.icon !== undefined || span.math) {
      const w = span.math ? span.math.width : size * 1.25;
      if (width > 0 && width + w > max)
        commit();
      current.push({ ...span, width: w });
      width += w;
      continue;
    }
    const pieces = span.text.match(RE_PIECE) ?? [];
    const soft = span.text.includes("\xAD");
    const n = soft ? pieces.length : 0;
    const own = new Float64Array(n);
    const rest = new Float64Array(n + 1);
    for (let q = n - 1;q >= 0; q--) {
      const shy = pieces[q].endsWith("\xAD");
      const end = pieces[q].trimEnd();
      own[q] = measurer.width(shy ? end.slice(0, -1) : end, size, span.style);
      rest[q] = !shy ? own[q] : q === n - 1 ? span === line[line.length - 1] ? own[q] : Infinity : own[q] + rest[q + 1];
    }
    for (let p = 0;p < pieces.length; p++) {
      let part = pieces[p];
      const partWidth = soft ? own[p] : measurer.width(part.trimEnd(), size, span.style);
      const fits = !soft || !part.endsWith("\xAD") ? width + partWidth <= max : width + measurer.width(part.slice(0, -1) + "-", size, span.style) <= max || width + rest[p] <= max;
      if (width > 0 && !fits) {
        commit(part.trimStart() === part);
        part = part.trimStart();
      }
      const last = current[current.length - 1];
      if (plain(last) && last.style === span.style) {
        last.text += part;
        if (partWidth > 0 || part.trimEnd() !== part) {
          const before = last.width;
          last.width = measurer.width(last.text, size, last.style);
          width += last.width - before;
        }
      } else {
        const w = measurer.width(part, size, span.style);
        current.push({ text: part, style: span.style, width: w });
        width += w;
      }
    }
  }
  if (current.length > 0 || out.length === 0)
    commit();
}
function layoutLabel(raw, markdown, measurer, size, maxWidth, base = 0) {
  if (raw === undefined || raw === "")
    return EMPTY;
  const lineHeight = Math.round(size * LINE_HEIGHT);
  if (mathActive() && raw.includes("$$") && !RE_MARK.test(raw)) {
    const found3 = { tex: [], math: [] };
    const marked = raw.replace(RE_MATH, (match, tex) => {
      if (found3.tex.length === MAX_MARKS)
        return match;
      found3.tex.push(tex);
      return String.fromCharCode(MARK + found3.tex.length - 1);
    });
    if (found3.tex.length > 0) {
      for (const tex of found3.tex)
        found3.math.push(typeset(decodeEntities(tex), size));
      return layoutMarkup(marked, markdown, measurer, size, maxWidth, base, lineHeight, found3);
    }
  }
  if (!RE_MARKUP.test(raw) && !raw.includes("&") && !raw.includes("\uFB02")) {
    const text = raw.trim();
    const width = measurer.width(text, size, base);
    if (width <= maxWidth || !(text.includes(" ") || RE_CJK.test(text) || RE_HINT.test(text))) {
      return {
        lines: [[{ text, style: base, width }]],
        widths: [width],
        width,
        height: lineHeight,
        size,
        lineHeight
      };
    }
    const lines = [];
    const widths = [];
    wrap([{ text, style: base, width }], measurer, size, maxWidth, lines, widths);
    let widest = 0;
    for (const w of widths)
      if (w > widest)
        widest = w;
    const snug = lines.length > 1 ? Math.round(size * WRAPPED_LINE_HEIGHT) : lineHeight;
    return { lines, widths, width: widest, height: lines.length * snug, size, lineHeight: snug };
  }
  return layoutMarkup(raw, markdown, measurer, size, maxWidth, base, lineHeight);
}
function layoutMarkup(raw, markdown, measurer, size, maxWidth, base, lineHeight, found3) {
  const outer = marks;
  marks = found3;
  try {
    const label = layoutLines(raw, markdown, measurer, size, maxWidth, base, lineHeight);
    return found3 ? withHeights(label) : label;
  } finally {
    marks = outer;
  }
}
function layoutLines(raw, markdown, measurer, size, maxWidth, base, lineHeight) {
  const source = markdown ? dedent(raw.replace(/\r\n?/g, `
`)).trim() : raw.trim();
  const lines = [];
  const widths = [];
  let width = 0;
  const open = { style: base, shifts: [] };
  for (const part of source.split(RE_BREAK)) {
    const line = [];
    inline(line, part.trim(), markdown, base, open);
    const w = measureSpans(line, measurer, size);
    if (w > maxWidth) {
      wrap(line, measurer, size, maxWidth, lines, widths);
    } else {
      lines.push(line);
      widths.push(w);
    }
  }
  for (const w of widths)
    if (w > width)
      width = w;
  const snug = lines.length > 1 ? Math.round(size * WRAPPED_LINE_HEIGHT) : lineHeight;
  return { lines, widths, width, height: lines.length * snug, size, lineHeight: snug };
}
function withHeights(label) {
  let heights;
  for (let i = 0;i < label.lines.length; i++) {
    let h = label.lineHeight;
    for (const span of label.lines[i])
      if (span.math)
        h = Math.max(h, Math.ceil(span.math.height + label.size / 4));
    if (h !== label.lineHeight && heights === undefined)
      heights = label.lines.map(() => label.lineHeight);
    if (heights)
      heights[i] = h;
  }
  if (heights === undefined) {
    return label.heights === undefined ? label : { ...label, heights: undefined, height: label.lines.length * label.lineHeight };
  }
  let height = 0;
  for (const h of heights)
    height += h;
  return { ...label, heights, height };
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/architecture/icons.ts
var GLYPHS = new Map([
  ["database", "M4 6a8 3 0 1 0 16 0a8 3 0 1 0-16 0M4 6v12a8 3 0 0 0 16 0V6M4 12a8 3 0 0 0 16 0"],
  ["server", "M3 4h18v7H3zM3 13h18v7H3zM7 7.5h.01M7 16.5h.01M11 7.5h6M11 16.5h6"],
  ["disk", "M5 3h14v18H5zM12 6.5a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 10.5h.01M8 18h3"],
  ["internet", "M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3a13 13 0 0 0 0 18M12 3a13 13 0 0 1 0 18"],
  ["cloud", "M7 18a4 4 0 0 1-.5-7.97A6 6 0 0 1 18 9.5a4.25 4.25 0 0 1-.5 8.5z"]
]);
function builtinIcon(name) {
  const d = GLYPHS.get(name);
  return d === undefined ? "" : `<path d="${d}" stroke="var(--_fg)" stroke-width="1.5"/>`;
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/architecture/layout.ts
var DX = [-1, 1, 0, 0];
var DY = [0, 0, -1, 1];
function sideIndex(side) {
  return side === "L" ? 0 : side === "R" ? 1 : side === "T" ? 2 : 3;
}
var SMALL = 64;
var OFFSET = 2 ** 25;
var SPAN = 2 ** 26;
function placeOnGrid(nodes, groups, edges, hints) {
  const N = nodes.length;
  const G = groups.length;
  const root = G;
  const nodeIndex = new Map;
  const groupIndex = new Map;
  const parent = new Int32Array(N + G).fill(root);
  const depth = new Int32Array(G + 1);
  const kids = [];
  for (let c = 0;c <= G; c++)
    kids.push([]);
  groups.forEach((group, g) => {
    groupIndex.set(group.id, g);
    const p = group.in === undefined ? undefined : groupIndex.get(group.in);
    if (p !== undefined && p !== g) {
      parent[N + g] = p;
      depth[g] = depth[p] + 1;
    } else {
      depth[g] = 1;
    }
  });
  nodes.forEach((node, i) => {
    nodeIndex.set(node.id, i);
    const p = node.in === undefined ? undefined : groupIndex.get(node.in);
    if (p !== undefined)
      parent[i] = p;
    kids[parent[i]].push(i);
  });
  for (let g = 0;g < G; g++)
    kids[parent[N + g]].push(N + g);
  const linkA = [];
  const linkB = [];
  const sideA = [];
  const sideB = [];
  const itemA = [];
  const itemB = [];
  const hintLinks = new Array(N + G);
  const edgeLinks = new Array(N + G);
  const addLink = (a, b, sa, sb, lists) => {
    if (a === b)
      return;
    let ia = a;
    let ib = b;
    let ca = parent[a];
    let cb = parent[b];
    while (ca !== cb) {
      if (depth[ca] >= depth[cb]) {
        ia = N + ca;
        ca = parent[ia];
      } else {
        ib = N + cb;
        cb = parent[ib];
      }
    }
    const k = linkA.length;
    linkA.push(a);
    linkB.push(b);
    sideA.push(sa);
    sideB.push(sb);
    itemA.push(ia);
    itemB.push(ib);
    (lists[ia] ??= []).push(k);
    (lists[ib] ??= []).push(k);
  };
  for (const hint of hints) {
    const row2 = hint.direction === "row";
    for (let i = 1;i < hint.members.length; i++) {
      const a = nodeIndex.get(hint.members[i - 1]);
      const b = nodeIndex.get(hint.members[i]);
      if (a !== undefined && b !== undefined)
        addLink(a, b, row2 ? 1 : 3, row2 ? 0 : 2, hintLinks);
    }
  }
  for (const likeSides of [false, true]) {
    for (const edge of edges) {
      if (edge.lhsDir === edge.rhsDir !== likeSides)
        continue;
      const a = nodeIndex.get(edge.lhsId);
      const b = nodeIndex.get(edge.rhsId);
      if (a !== undefined && b !== undefined)
        addLink(a, b, sideIndex(edge.lhsDir), sideIndex(edge.rhsDir), edgeLinks);
    }
  }
  const x = new Int32Array(N + G);
  const y = new Int32Array(N + G);
  const w = new Int32Array(N + G).fill(1);
  const h = new Int32Array(N + G).fill(1);
  const placed = new Uint8Array(N + G);
  const order = [];
  const cells = new Map;
  const large = [];
  const reach = new Map;
  let first = 0;
  let ax = 0;
  let ay = 0;
  const anchor = (node, item) => {
    ax = 0;
    ay = 0;
    for (let cur = node;cur !== item; cur = N + parent[cur]) {
      ax += x[cur];
      ay += y[cur];
    }
  };
  const put = (item, px, py) => {
    x[item] = px;
    y[item] = py;
    placed[item] = 1;
    order.push(item);
    if (w[item] * h[item] > SMALL) {
      large.push(item);
      return;
    }
    for (let cy = py;cy < py + h[item]; cy++) {
      for (let cx = px;cx < px + w[item]; cx++)
        cells.set((cx + OFFSET) * SPAN + cy + OFFSET, item);
    }
  };
  const overlaps = (item, rx, ry, rw, rh) => x[item] < rx + rw && rx < x[item] + w[item] && y[item] < ry + rh && ry < y[item] + h[item];
  const collide = (rx, ry, rw, rh) => {
    if (rw * rh > SMALL) {
      for (let i = first;i < order.length; i++)
        if (overlaps(order[i], rx, ry, rw, rh))
          return order[i];
      return -1;
    }
    for (let cy = ry;cy < ry + rh; cy++) {
      for (let cx = rx;cx < rx + rw; cx++) {
        const hit = cells.get((cx + OFFSET) * SPAN + cy + OFFSET);
        if (hit !== undefined)
          return hit;
      }
    }
    for (const item of large)
      if (overlaps(item, rx, ry, rw, rh))
        return item;
    return -1;
  };
  const slide = (rx, ry, rw, rh, sx, sy) => {
    const key = `${rx},${ry},${rw},${rh},${sx},${sy}`;
    let k = reach.get(key) ?? 0;
    for (;; ) {
      const hit = collide(rx + k * sx, ry + k * sy, rw, rh);
      if (hit < 0)
        break;
      k = sx > 0 ? x[hit] + w[hit] - rx : sx < 0 ? rx + rw - x[hit] : sy > 0 ? y[hit] + h[hit] - ry : ry + rh - y[hit];
    }
    reach.set(key, k);
    return k;
  };
  const follow = (from, k) => {
    const forward = itemA[k] === from;
    const to = forward ? itemB[k] : itemA[k];
    if (placed[to])
      return;
    const sp = forward ? sideA[k] : sideB[k];
    const sq = forward ? sideB[k] : sideA[k];
    anchor(forward ? linkA[k] : linkB[k], from);
    const pax = ax;
    const pay = ay;
    anchor(forward ? linkB[k] : linkA[k], to);
    let dx = DX[sp];
    let dy = DY[sp];
    let shiftX = 0;
    let shiftY = 0;
    const facing = DX[sp] + DX[sq] === 0 && DY[sp] + DY[sq] === 0;
    if (sp === sq) {
      dx = DX[sp] === 0 ? 1 : 0;
      dy = 1 - dx;
    } else if (!facing) {
      shiftX = -DX[sq];
      shiftY = -DY[sq];
    }
    let bx;
    let by;
    if (dx !== 0) {
      bx = dx > 0 ? x[from] + w[from] : x[from] - w[to];
      by = y[from] + pay + shiftY - ay;
    } else {
      by = dy > 0 ? y[from] + h[from] : y[from] - h[to];
      bx = x[from] + pax + shiftX - ax;
    }
    if (facing) {
      const list = edgeLinks[to];
      if (list !== undefined && list.length > 1) {
        const wanted = [];
        for (const j of list) {
          const toIsB = itemB[j] === to;
          const other = toIsB ? itemA[j] : itemB[j];
          if (!placed[other] || (toIsB ? sideA[j] : sideB[j]) !== sp || (toIsB ? sideB[j] : sideA[j]) !== sq)
            continue;
          anchor(toIsB ? linkA[j] : linkB[j], other);
          const at = dx !== 0 ? y[other] + ay : x[other] + ax;
          anchor(toIsB ? linkB[j] : linkA[j], to);
          wanted.push(at - (dx !== 0 ? ay : ax));
        }
        if (wanted.length > 1) {
          wanted.sort((a, b) => a - b);
          if (dx !== 0)
            by = wanted[wanted.length - 1 >> 1];
          else
            bx = wanted[wanted.length - 1 >> 1];
        }
      }
      const px = dx === 0 ? 1 : 0;
      const py = 1 - px;
      const forth = slide(bx, by, w[to], h[to], px, py);
      const back = forth === 0 ? 0 : slide(bx, by, w[to], h[to], -px, -py);
      const near = forth <= back ? forth : -back;
      bx += px * near;
      by += py * near;
    } else {
      const far = slide(bx, by, w[to], h[to], dx, dy);
      bx += dx * far;
      by += dy * far;
    }
    put(to, bx, by);
  };
  const layout = (c) => {
    const items = kids[c];
    if (items.length === 0)
      return;
    order.length = 0;
    const starts = [];
    for (const start of items) {
      if (placed[start])
        continue;
      first = order.length;
      starts.push(first);
      cells.clear();
      large.length = 0;
      reach.clear();
      put(start, 0, 0);
      let hintAt = first;
      let edgeAt = first;
      let linkAt = 0;
      for (;; ) {
        if (hintAt < order.length) {
          const from = order[hintAt++];
          const list2 = hintLinks[from];
          if (list2 !== undefined)
            for (const k of list2)
              follow(from, k);
          continue;
        }
        if (edgeAt >= order.length)
          break;
        const list = edgeLinks[order[edgeAt]];
        if (list === undefined || linkAt >= list.length) {
          edgeAt++;
          linkAt = 0;
          continue;
        }
        follow(order[edgeAt], list[linkAt++]);
      }
    }
    starts.push(order.length);
    const count = starts.length - 1;
    const minX = new Array(count);
    const minY = new Array(count);
    const partW = new Array(count);
    const partH = new Array(count);
    let area = 0;
    let widest = 0;
    for (let p = 0;p < count; p++) {
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let i = starts[p];i < starts[p + 1]; i++) {
        const item = order[i];
        x0 = Math.min(x0, x[item]);
        y0 = Math.min(y0, y[item]);
        x1 = Math.max(x1, x[item] + w[item]);
        y1 = Math.max(y1, y[item] + h[item]);
      }
      minX[p] = x0;
      minY[p] = y0;
      partW[p] = x1 - x0;
      partH[p] = y1 - y0;
      area += partW[p] * partH[p];
      widest = Math.max(widest, partW[p]);
    }
    const limit = Math.max(widest, Math.ceil(Math.sqrt(area * 2)));
    let cx = 0;
    let cy = 0;
    let shelf = 0;
    let width = 0;
    for (let p = 0;p < count; p++) {
      if (cx > 0 && cx + partW[p] > limit) {
        cy += shelf;
        cx = 0;
        shelf = 0;
      }
      for (let i = starts[p];i < starts[p + 1]; i++) {
        x[order[i]] += cx - minX[p];
        y[order[i]] += cy - minY[p];
      }
      cx += partW[p];
      shelf = Math.max(shelf, partH[p]);
      width = Math.max(width, cx);
    }
    if (c < G) {
      w[N + c] = width;
      h[N + c] = cy + shelf;
    }
  };
  for (let c = G - 1;c >= 0; c--)
    layout(c);
  layout(root);
  const groupCol = new Int32Array(G);
  const groupRow = new Int32Array(G);
  const groupParent = new Int32Array(G);
  const groupEmpty = new Uint8Array(G);
  for (let g = 0;g < G; g++) {
    const p = parent[N + g];
    groupParent[g] = p === root ? -1 : p;
    groupCol[g] = x[N + g] + (p === root ? 0 : groupCol[p]);
    groupRow[g] = y[N + g] + (p === root ? 0 : groupRow[p]);
    if (kids[g].length === 0)
      groupEmpty[g] = 1;
  }
  const col = new Int32Array(N);
  const row = new Int32Array(N);
  const nodeParent = new Int32Array(N);
  for (let i = 0;i < N; i++) {
    const p = parent[i];
    nodeParent[i] = p === root ? -1 : p;
    col[i] = x[i] + (p === root ? 0 : groupCol[p]);
    row[i] = y[i] + (p === root ? 0 : groupRow[p]);
  }
  return {
    col,
    row,
    groupCol,
    groupRow,
    groupCols: w.slice(N),
    groupRows: h.slice(N),
    groupParent,
    groupEmpty,
    nodeParent
  };
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/architecture/render.ts
var STUB = 12;
var CORNER = 6;
var LABEL_GAP = 4;
var DOT = 3;
var DX2 = [-1, 1, 0, 0];
var DY2 = [0, 0, -1, 1];
function setting(config, key, fallback, min, max) {
  const section = config.architecture;
  const value = section !== null && typeof section === "object" && !Array.isArray(section) ? section[key] : undefined;
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
function rank(values) {
  const out = new Map;
  for (const value of values.sort((a, b) => a - b))
    if (!out.has(value))
      out.set(value, out.size);
  return out;
}
function iconSlot(name, x, y, side, icons) {
  return `<svg class="pele-icon" data-icon="${escText(name)}" x="${num(x)}" y="${num(y)}" width="${num(side)}" height="${num(side)}"` + ` viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons?.(name) ?? builtinIcon(name)}</svg>`;
}
function fit(label, maxWidth, maxLines, measurer) {
  const cut = label.lines.length > maxLines;
  if (!cut && label.width <= maxWidth)
    return label;
  const dots = measurer.width("\u2026", label.size, 0);
  const lines = [];
  const widths = [];
  let widest = 0;
  for (let i = 0;i < Math.min(maxLines, label.lines.length); i++) {
    const line = label.lines[i].map((span) => ({ ...span }));
    let width = label.widths[i];
    if (width > maxWidth || cut && i === maxLines - 1) {
      for (;; ) {
        const span = line[line.length - 1];
        if (span === undefined) {
          line.push({ text: "\u2026", style: 0, width: dots });
          width = dots;
          break;
        }
        const rest = width - span.width;
        if (span.icon === undefined && rest + dots < maxWidth) {
          let lo = 0;
          let hi = span.text.length;
          while (lo < hi) {
            const mid = lo + hi + 1 >> 1;
            if (rest + measurer.width(span.text.slice(0, mid), label.size, span.style) + dots <= maxWidth)
              lo = mid;
            else
              hi = mid - 1;
          }
          const code = lo > 0 ? span.text.charCodeAt(lo - 1) : 0;
          if (code >= 55296 && code <= 56319)
            lo--;
          span.text = span.text.slice(0, lo).trimEnd() + "\u2026";
          span.width = measurer.width(span.text, label.size, span.style);
          width = rest + span.width;
          break;
        }
        line.pop();
        width = rest;
      }
    }
    lines.push(line);
    widths.push(width);
    widest = Math.max(widest, width);
  }
  return { ...label, lines, widths, width: widest, height: lines.length * label.lineHeight };
}
function route(s, e) {
  const { x: sx, y: sy, dx: sdx, dy: sdy } = s;
  const { x: ex, y: ey, dx: edx, dy: edy } = e;
  const s1x = sx + sdx * STUB;
  const s1y = sy + sdy * STUB;
  const e1x = ex + edx * STUB;
  const e1y = ey + edy * STUB;
  if (sdx * edx + sdy * edy === 0) {
    const cx = sdx !== 0 ? ex : sx;
    const cy = sdx !== 0 ? sy : ey;
    if ((cx - sx) * sdx + (cy - sy) * sdy > 0 && (cx - ex) * edx + (cy - ey) * edy > 0)
      return [sx, sy, cx, cy, ex, ey];
    return sdx !== 0 ? [sx, sy, s1x, s1y, s1x, e1y, e1x, e1y, ex, ey] : [sx, sy, s1x, s1y, e1x, s1y, e1x, e1y, ex, ey];
  }
  const sideways = sdx !== 0;
  const offset = sideways ? ey - sy : ex - sx;
  if (sdx === -edx && sdy === -edy) {
    const ahead = (ex - sx) * sdx + (ey - sy) * sdy;
    if (ahead > 0) {
      if (Math.abs(offset) < 0.5)
        return [sx, sy, ex, ey];
      if (sideways) {
        const lo2 = sdx > 0 ? s.x1 : e.x1;
        const hi2 = sdx > 0 ? e.x0 : s.x0;
        const mx = lo2 < hi2 ? (lo2 + hi2) / 2 : (sx + ex) / 2;
        return [sx, sy, mx, sy, mx, ey, ex, ey];
      }
      const lo = sdy > 0 ? s.y1 : e.y1;
      const hi = sdy > 0 ? e.y0 : s.y0;
      const my = lo < hi ? (lo + hi) / 2 : (sy + ey) / 2;
      return [sx, sy, sx, my, ex, my, ex, ey];
    }
  } else if (Math.abs(offset) >= 1) {
    if (sideways) {
      const x = sdx > 0 ? Math.max(sx, ex) + STUB : Math.min(sx, ex) - STUB;
      return [sx, sy, x, sy, x, ey, ex, ey];
    }
    const y = sdy > 0 ? Math.max(sy, ey) + STUB : Math.min(sy, ey) - STUB;
    return [sx, sy, sx, y, ex, y, ex, ey];
  }
  if (sideways) {
    const lane2 = s.y1 + STUB <= e.y0 ? (s.y1 + e.y0) / 2 : e.y1 + STUB <= s.y0 ? (e.y1 + s.y0) / 2 : Math.max(s.y1, e.y1) + STUB;
    return [sx, sy, s1x, sy, s1x, lane2, e1x, lane2, e1x, ey, ex, ey];
  }
  const lane = s.x1 + STUB <= e.x0 ? (s.x1 + e.x0) / 2 : e.x1 + STUB <= s.x0 ? (e.x1 + s.x0) / 2 : Math.max(s.x1, e.x1) + STUB;
  return [sx, sy, sx, s1y, lane, s1y, lane, e1y, ex, e1y, ex, ey];
}
function simplify(p) {
  const out = [p[0], p[1]];
  for (let i = 2;i < p.length; i += 2) {
    const x = p[i];
    const y = p[i + 1];
    const n = out.length;
    const sameX = Math.abs(x - out[n - 2]) < 0.01;
    const sameY = Math.abs(y - out[n - 1]) < 0.01;
    if (sameX && sameY)
      continue;
    if (n >= 4 && (sameX && Math.abs(out[n - 4] - out[n - 2]) < 0.01 || sameY && Math.abs(out[n - 3] - out[n - 1]) < 0.01)) {
      out[n - 2] = x;
      out[n - 1] = y;
    } else {
      out.push(x, y);
    }
  }
  return out;
}
function pathData(p, startTrim, endTrim) {
  const n = p.length / 2;
  const xs = new Array(n);
  const ys = new Array(n);
  for (let i = 0;i < n; i++) {
    xs[i] = p[i * 2];
    ys[i] = p[i * 2 + 1];
  }
  const trim = (at, toward, amount) => {
    const len = Math.hypot(xs[toward] - xs[at], ys[toward] - ys[at]);
    const t = Math.min(amount, Math.max(0, len - 1));
    if (len > 0 && t > 0) {
      xs[at] += (xs[toward] - xs[at]) / len * t;
      ys[at] += (ys[toward] - ys[at]) / len * t;
    }
  };
  trim(0, 1, startTrim);
  trim(n - 1, n - 2, endTrim);
  let d = `M${num(xs[0])},${num(ys[0])}`;
  for (let i = 1;i < n - 1; i++) {
    const before = Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    const after = Math.hypot(xs[i + 1] - xs[i], ys[i + 1] - ys[i]);
    const r = Math.min(CORNER, before / 2, after / 2);
    if (r < 0.5) {
      d += `L${num(xs[i])},${num(ys[i])}`;
      continue;
    }
    const inX = xs[i] - (xs[i] - xs[i - 1]) / before * r;
    const inY = ys[i] - (ys[i] - ys[i - 1]) / before * r;
    const outX = xs[i] + (xs[i + 1] - xs[i]) / after * r;
    const outY = ys[i] + (ys[i + 1] - ys[i]) / after * r;
    d += `L${num(inX)},${num(inY)}Q${num(xs[i])},${num(ys[i])} ${num(outX)},${num(outY)}`;
  }
  return d + `L${num(xs[n - 1])},${num(ys[n - 1])}`;
}
function renderArchitecture(model, config, options) {
  return tighten(options, (tight) => draw(model, config, options, tight));
}
function draw(model, config, options, tight) {
  const iconSize = setting(config, "iconSize", 48, 8, 512);
  const size = setting(config, "fontSize", options.fontSize ?? 16, 4, 128);
  const groupPad = Math.min(setting(config, "padding", 20, 0, 256), tight ? 12 : Infinity);
  const small = Math.round(size * 0.875);
  const measurer = options.measurer ?? defaultMeasurer(options.fontFamily, options.fontFamilyMono);
  const pad = options.padding ?? 8;
  const icons = options.icons;
  const half = iconSize / 2;
  const nodes = [...model.nodes.values()];
  const groups = [...model.groups.values()];
  const N = nodes.length;
  const G = groups.length;
  const grid = placeOnGrid(nodes, groups, model.edges, model.layoutHints);
  const index = new Map;
  nodes.forEach((node, i) => index.set(node.id, i));
  const labels = new Array(N);
  const boxW = new Float64Array(N);
  const boxH = new Float64Array(N);
  const wrap2 = tight ? Math.max(iconSize, 64) : Math.max(iconSize * 2.25, 96);
  for (let i = 0;i < N; i++) {
    const node = nodes[i];
    const label = layoutLabel(node.type === "service" ? node.title : undefined, true, measurer, size, wrap2);
    labels[i] = label;
    boxW[i] = Math.max(iconSize, 2 * Math.ceil(label.width / 2));
    boxH[i] = iconSize + (label.height > 0 ? LABEL_GAP + label.height : 0);
  }
  const colValues = [];
  const rowValues = [];
  for (let i = 0;i < N; i++) {
    colValues.push(grid.col[i]);
    rowValues.push(grid.row[i]);
  }
  for (let g = 0;g < G; g++) {
    if (!grid.groupEmpty[g])
      continue;
    colValues.push(grid.groupCol[g]);
    rowValues.push(grid.groupRow[g]);
  }
  const colOf = rank(colValues);
  const rowOf = rank(rowValues);
  const C = colOf.size;
  const R = rowOf.size;
  const colW = new Float64Array(C);
  const rowH = new Float64Array(R);
  const gap = tight ? Math.max(24, 2 * STUB) : Math.max(40, Math.round(iconSize * 0.75));
  const gapX = new Float64Array(C).fill(gap);
  const gapY = new Float64Array(R).fill(gap);
  const nodeCol = new Int32Array(N);
  const nodeRow = new Int32Array(N);
  for (let i = 0;i < N; i++) {
    const c = nodeCol[i] = colOf.get(grid.col[i]);
    const r = nodeRow[i] = rowOf.get(grid.row[i]);
    colW[c] = Math.max(colW[c], boxW[i]);
    rowH[r] = Math.max(rowH[r], boxH[i]);
  }
  for (let g = 0;g < G; g++) {
    if (!grid.groupEmpty[g])
      continue;
    const c = colOf.get(grid.groupCol[g]);
    const r = rowOf.get(grid.groupRow[g]);
    colW[c] = Math.max(colW[c], iconSize);
    rowH[r] = Math.max(rowH[r], half);
  }
  const E = model.edges.length;
  const edgeLabels = new Array(E);
  const ends = new Int32Array(E * 2);
  for (let k = 0;k < E; k++) {
    const edge = model.edges[k];
    const a = ends[k * 2] = index.get(edge.lhsId) ?? -1;
    const b = ends[k * 2 + 1] = index.get(edge.rhsId) ?? -1;
    const label = layoutLabel(edge.title, true, measurer, small, 160);
    edgeLabels[k] = label;
    if (label.width === 0 || a < 0 || b < 0)
      continue;
    if (nodeCol[a] !== nodeCol[b]) {
      const c = Math.min(nodeCol[a], nodeCol[b]);
      gapX[c] = Math.max(gapX[c], Math.ceil(label.width) + 28);
    } else {
      colW[nodeCol[a]] = Math.max(colW[nodeCol[a]], 2 * Math.ceil(label.width / 2) + 8);
      if (nodeRow[a] !== nodeRow[b]) {
        const r = Math.min(nodeRow[a], nodeRow[b]);
        gapY[r] = Math.max(gapY[r], Math.ceil(label.height) + 24);
      }
    }
  }
  const groupLabels = new Array(G);
  const c0 = new Int32Array(G);
  const c1 = new Int32Array(G);
  const r0 = new Int32Array(G);
  const r1 = new Int32Array(G);
  const insL = new Float64Array(G);
  const insR = new Float64Array(G);
  const insT = new Float64Array(G);
  const insB = new Float64Array(G);
  const headW = new Float64Array(G);
  const headH = new Float64Array(G);
  const colL = new Float64Array(C);
  const colR = new Float64Array(C);
  const rowT = new Float64Array(R);
  const rowB = new Float64Array(R);
  const badge = Math.round(size * 1.25);
  for (let g = 0;g < G; g++) {
    c0[g] = colOf.get(grid.groupCol[g]);
    c1[g] = colOf.get(grid.groupCol[g] + grid.groupCols[g] - 1);
    r0[g] = rowOf.get(grid.groupRow[g]);
    r1[g] = rowOf.get(grid.groupRow[g] + grid.groupRows[g] - 1);
    const label = layoutLabel(groups[g].title, true, measurer, size, tight ? Math.max(80, titleRoom(options) / 2) : 320);
    groupLabels[g] = label;
    const icon = groups[g].icon ? badge : 0;
    headW[g] = label.width + icon + (label.width > 0 && icon > 0 ? 6 : 0);
    headH[g] = Math.max(label.height, icon);
  }
  for (let g = G - 1;g >= 0; g--) {
    const left2 = groupPad + insL[g];
    let right2 = groupPad + insR[g];
    const top2 = (headH[g] > 0 ? Math.max(groupPad, headH[g] + 12) : groupPad) + insT[g];
    const bottom2 = groupPad + insB[g];
    if (headW[g] > 0) {
      let inner = left2 + right2;
      for (let c = c0[g];c <= c1[g]; c++)
        inner += colW[c] + (c < c1[g] ? colR[c] + gapX[c] + colL[c + 1] : 0);
      if (headW[g] + 20 > inner)
        right2 += Math.ceil(headW[g] + 20 - inner);
    }
    insL[g] = left2;
    insR[g] = right2;
    insT[g] = top2;
    insB[g] = bottom2;
    colL[c0[g]] = Math.max(colL[c0[g]], left2);
    colR[c1[g]] = Math.max(colR[c1[g]], right2);
    rowT[r0[g]] = Math.max(rowT[r0[g]], top2);
    rowB[r1[g]] = Math.max(rowB[r1[g]], bottom2);
    const p = grid.groupParent[g];
    if (p < 0)
      continue;
    if (c0[p] === c0[g])
      insL[p] = Math.max(insL[p], left2);
    if (c1[p] === c1[g])
      insR[p] = Math.max(insR[p], right2);
    if (r0[p] === r0[g])
      insT[p] = Math.max(insT[p], top2);
    if (r1[p] === r1[g])
      insB[p] = Math.max(insB[p], bottom2);
  }
  const X = new Float64Array(C);
  const Y = new Float64Array(R);
  let innerW = 0;
  for (let c = 0;c < C; c++) {
    X[c] = innerW + colL[c];
    innerW = X[c] + colW[c] + colR[c] + (c < C - 1 ? gapX[c] : 0);
  }
  let innerH = 0;
  for (let r = 0;r < R; r++) {
    Y[r] = innerH + rowT[r];
    innerH = Y[r] + rowH[r] + rowB[r] + (r < R - 1 ? gapY[r] : 0);
  }
  let minX = 0;
  let minY = 0;
  let maxX = innerW;
  let maxY = innerH;
  const left = (g) => X[c0[g]] - insL[g];
  const right = (g) => X[c1[g]] + colW[c1[g]] + insR[g];
  const top = (g) => Y[r0[g]] - insT[g];
  const bottom = (g) => Y[r1[g]] + rowH[r1[g]] + insB[g];
  const centerX = (i) => X[nodeCol[i]] + colW[nodeCol[i]] / 2;
  const port = (i, side, viaGroup) => {
    const dx = DX2[side];
    const dy = DY2[side];
    const cx = centerX(i);
    const y = Y[nodeRow[i]];
    const p = { x: cx, y: y + half, dx, dy, x0: cx - boxW[i] / 2, y0: y, x1: cx + boxW[i] / 2, y1: y + boxH[i], gap: 0, wire: false };
    if (nodes[i].type === "junction") {
      p.x0 = p.x1 = cx;
      p.y0 = p.y1 = p.y;
      p.gap = DOT;
    } else if (dx !== 0) {
      p.x = cx + dx * half;
    } else {
      p.y = dy < 0 ? y : y + boxH[i] + (labels[i].height > 0 ? 2 : 0);
    }
    const g = viaGroup ? grid.nodeParent[i] : -1;
    if (g >= 0) {
      p.x0 = left(g);
      p.x1 = right(g);
      p.y0 = top(g);
      p.y1 = bottom(g);
      p.gap = 0;
      p.wire = nodes[i].type === "junction";
      if (dx !== 0)
        p.x = dx < 0 ? p.x0 : p.x1;
      else
        p.y = dy < 0 ? p.y0 : p.y1;
    }
    return p;
  };
  const geometryRoutes = [];
  const geometryHeaders = [];
  let edgesOut = "";
  let labelsOut = "";
  const runs = [];
  const trimLength = markerTrim("arrow_point");
  for (let k = 0;k < E; k++) {
    const edge = model.edges[k];
    const a = ends[k * 2];
    const b = ends[k * 2 + 1];
    if (a < 0 || b < 0)
      continue;
    const s = port(a, sideIndex(edge.lhsDir), edge.lhsGroup);
    const e = port(b, sideIndex(edge.rhsDir), edge.rhsGroup);
    if (s.x === e.x && s.y === e.y && s.dx === e.dx) {
      s.x -= 8 * Math.abs(s.dy);
      s.y -= 8 * Math.abs(s.dx);
      e.x += 8 * Math.abs(s.dy);
      e.y += 8 * Math.abs(s.dx);
    }
    const routed = route(s, e);
    if (s.wire)
      routed.unshift(centerX(a), Y[nodeRow[a]] + half);
    if (e.wire)
      routed.push(centerX(b), Y[nodeRow[b]] + half);
    const points = simplify(routed);
    if (points.length < 4)
      continue;
    geometryRoutes.push({ source: edge.lhsId, target: edge.rhsId, sourcePort: edge.lhsDir.toUpperCase(), targetPort: edge.rhsDir.toUpperCase(), sourceAnchor: s.wire ? { x: centerX(a), y: Y[nodeRow[a]] + half } : { x: s.x, y: s.y }, targetAnchor: e.wire ? { x: centerX(b), y: Y[nodeRow[b]] + half } : { x: e.x, y: e.y }, points: Array.from({ length: points.length / 2 }, (_, i) => ({ x: points[i * 2], y: points[i * 2 + 1] })) });
    const id = escText(`${edge.lhsId}-${edge.rhsId}`);
    edgesOut += `<g class="pele-edge" data-id="${id}">` + `<path d="${pathData(points, edge.lhsInto && !s.wire ? trimLength + s.gap : 0, edge.rhsInto && !e.wire ? trimLength + e.gap : 0)}"/>` + (edge.lhsInto ? marker("arrow_point", s.x + s.dx * s.gap, s.y + s.dy * s.gap, -s.dx, -s.dy, "var(--_l)") : "") + (edge.rhsInto ? marker("arrow_point", e.x + e.dx * e.gap, e.y + e.dy * e.gap, -e.dx, -e.dy, "var(--_l)") : "") + "</g>";
    let best = -1;
    let bestLength = -1;
    let flat = -1;
    let flatLength = -1;
    const label = edgeLabels[k];
    for (let i = 0;i < points.length; i += 2) {
      minX = Math.min(minX, points[i] - 4);
      maxX = Math.max(maxX, points[i] + 4);
      minY = Math.min(minY, points[i + 1] - 4);
      maxY = Math.max(maxY, points[i + 1] + 4);
    }
    for (let i = 0;i + 3 < points.length; i += 2) {
      const horizontal = Math.abs(points[i + 1] - points[i + 3]) < 0.01;
      const length = Math.abs(points[i] - points[i + 2]) + Math.abs(points[i + 1] - points[i + 3]);
      if (!horizontal)
        runs.push(points[i], Math.min(points[i + 1], points[i + 3]), Math.max(points[i + 1], points[i + 3]));
      if (length > bestLength) {
        best = i;
        bestLength = length;
      }
      if (horizontal && length > flatLength) {
        flat = i;
        flatLength = length;
      }
    }
    if (label.width > 0) {
      const at = flatLength >= label.width + 8 ? flat : best;
      let x = (points[at] + points[at + 2]) / 2;
      let y = (points[at + 1] + points[at + 3]) / 2;
      const w = label.width + 8;
      const upright = Math.abs(points[at] - points[at + 2]) < 0.01;
      for (const p of [s, e]) {
        if (x + w / 2 <= p.x0 || x - w / 2 >= p.x1 || y + label.height / 2 <= p.y0 || y - label.height / 2 >= p.y1)
          continue;
        if (upright)
          x = x >= (p.x0 + p.x1) / 2 ? p.x1 + w / 2 + 4 : p.x0 - w / 2 - 4;
        else
          y = y >= (p.y0 + p.y1) / 2 ? p.y1 + label.height / 2 + 4 : p.y0 - label.height / 2 - 4;
      }
      minX = Math.min(minX, x - w / 2);
      maxX = Math.max(maxX, x + w / 2);
      minY = Math.min(minY, y - label.height / 2);
      maxY = Math.max(maxY, y + label.height / 2);
      labelsOut += edgeLabelSvg(`${edge.lhsId}-${edge.rhsId}`, label, x, y, "", icons);
    }
  }
  let clusters = "";
  for (let g = 0;g < G; g++) {
    const group = groups[g];
    const x = left(g);
    const y = top(g);
    const w = right(g) - x;
    const label = groupLabels[g];
    let head = "";
    if (headW[g] > 0) {
      const band = y + headH[g] + 12;
      const crossings = [];
      for (let i = 0;i < runs.length; i += 3) {
        if (runs[i + 1] < band && runs[i + 2] > y && runs[i] > x && runs[i] < x + w)
          crossings.push(runs[i]);
      }
      crossings.sort((a, b) => a - b);
      crossings.push(x + w - 4);
      let start = x + 10;
      for (const crossing of crossings) {
        if (crossing - 6 - start >= headW[g])
          break;
        start = Math.max(start, crossing + 6);
      }
      if (start + headW[g] > x + w - 4)
        start = x + 10;
      const cy = y + 6 + headH[g] / 2;
      let textX = start;
      if (group.icon) {
        head += iconSlot(group.icon, start, cy - badge / 2, badge, icons);
        textX += badge + 6;
      }
      geometryHeaders.push({ x: start, y: cy - headH[g] / 2, width: headW[g], height: headH[g] });
      head += labelSvg(label, textX + label.width / 2, cy, ' class="pele-cluster-label" fill="var(--_m)"', icons);
    }
    clusters += `<g class="pele-cluster" data-id="${escText(group.id)}">` + `<rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(bottom(g) - y)}" fill="var(--_a)" fill-opacity="0.5" stroke="var(--_b)"${ROUNDED}/>` + head + "</g>";
  }
  let nodesOut = "";
  const glyph = iconSize * 0.5;
  const textSize = Math.max(6, Math.round(size * 0.75));
  for (let i = 0;i < N; i++) {
    const node = nodes[i];
    const at = `data-id="${escText(node.id)}" transform="translate(${num(centerX(i))},${num(Y[nodeRow[i]])})"`;
    if (node.type === "junction") {
      nodesOut += `<g class="pele-node pele-junction" ${at}><circle cy="${num(half)}" r="${DOT}" fill="var(--_l)"/></g>`;
      continue;
    }
    let inner = "";
    if (node.icon) {
      inner = iconSlot(node.icon, -glyph / 2, (iconSize - glyph) / 2, glyph, icons);
    } else if (node.iconText) {
      const text = layoutLabel(node.iconText, false, measurer, textSize, iconSize - 8);
      const lines = Math.max(1, Math.floor((iconSize - 4) / (text.lineHeight || 1)));
      inner = labelSvg(fit(text, iconSize - 8, lines, measurer), 0, half, ` class="pele-icon-text" font-size="${textSize}"`, icons);
    }
    nodesOut += `<g class="pele-node pele-service" ${at}>` + `<rect x="${num(-half)}" width="${num(iconSize)}" height="${num(iconSize)}" fill="var(--_s)" stroke="var(--_b)"${ROUNDED}/>` + inner + labelSvg(labels[i], 0, iconSize + LABEL_GAP + labels[i].height / 2, ' class="pele-label"', icons) + "</g>";
  }
  const title = layoutLabel(model.title, false, measurer, size, tight ? titleRoom(options) : 4000, 1 /* Bold */);
  const titleHeight = title.height > 0 ? title.height + 12 : 0;
  const width = Math.ceil(Math.max(maxX - minX, title.width) + 2 * pad);
  const height = Math.ceil(maxY - minY + titleHeight + 2 * pad);
  const ox = Math.round((width - (maxX - minX)) / 2 - minX);
  const oy = Math.round(pad + titleHeight - minY);
  const body = (clusters ? `<g class="pele-clusters">${clusters}</g>` : "") + (edgesOut ? `<g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round" stroke-linejoin="round">${edgesOut}</g>` : "") + (labelsOut ? `<g class="pele-edge-labels" font-size="${small}">${labelsOut}</g>` : "") + (nodesOut ? `<g class="pele-nodes">${nodesOut}</g>` : "");
  const svg = svgDocument("architecture", width, height, size, options, model, labelSvg(title, width / 2, pad + title.height / 2, ' class="pele-title" font-weight="var(--_tw)"') + (body ? `<g transform="translate(${ox},${oy})">${body}</g>` : ""));
  const services = nodes.map((node, i) => ({ id: node.id, icon: node.type === "junction" ? { x: centerX(i) - DOT, y: Y[nodeRow[i]] + half - DOT, width: DOT * 2, height: DOT * 2 } : { x: centerX(i) - half, y: Y[nodeRow[i]], width: iconSize, height: iconSize }, ...labels[i].height ? { label: { x: centerX(i) - labels[i].width / 2, y: Y[nodeRow[i]] + iconSize + LABEL_GAP, width: labels[i].width, height: labels[i].height } } : {} }));
  return { svg, width, height, links: [], geometry: { services, routes: geometryRoutes, headers: geometryHeaders, offset: { x: ox, y: oy } } };
}

// ../../../../private/var/folders/5p/txt5dzv57mj59wjlq4l5s1280000gn/T/pele-geometry-E37heG/src/diagrams/architecture/index.ts
var architecture = {
  type: "architecture",
  parse(source, _config, title) {
    const db = new ArchitectureDb;
    if (title)
      db.title = title;
    populate(parseArchitecture(source), db);
    return db;
  },
  render: renderArchitecture
};
export {
  architecture
};
