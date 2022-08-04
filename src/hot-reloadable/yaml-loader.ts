import { load, DEFAULT_SCHEMA, Schema, Type } from "js-yaml"
import { readFile, readdir } from "fs/promises"
import { eco, rarities, rarity, readdirR } from "../util.js"
import { ItemTypeData } from "./economy.js";
import { join } from "path";

var { items, ItemType } = eco()

interface ContentType<T> {
    getValue: (obj: any, id: string) => T | null,
    map: Map<string, T>,
    schema: NodeJS.Dict<any>,
}

const types = new Map<string, ContentType<any>>();
types.set("ItemType", {
    getValue: (obj: ItemTypeData, id: string) => {
        var it = items.get(id)
        if (it) {
            it.patch(obj)
            return it
        }
        return new ItemType("YAML Placeholder", "Y", obj)
    },
    map: items,
    schema: {},
})
const ContentPath = "content"
const customSchema = DEFAULT_SCHEMA.extend([
    new Type("!bigint", {
        kind: "scalar",
        resolve: data => !isNaN(data),
        construct: data => BigInt(data),
        represent: value => value + "",
        instanceOf: (v: any) => typeof v == "bigint"
    }),
    new Type("!rarity", {
        kind: "scalar",
        resolve: data => data.toUpperCase() in rarity,
        //@ts-ignore
        construct: data => rarity[data.toUpperCase()],
        represent: value => value + "",
        instanceOf: (v: any) => typeof v == "number" && v in rarities
    })
])
async function loadFile(path: string) {
    console.log(`Loading file: ${path}`)
    var obj = load(await readFile(path, "utf8"), { schema: customSchema }) as any
    var defaultType = obj.DefaultType
    delete obj.DefaultType
    for (var k in obj) {
        var o = obj[k]
        var type = types.get(o.type || defaultType)
        delete o.type
        if (!type) {
            console.log(`${k} has an invalid type: '${o.type || defaultType}'`)
            continue
        }
        var val = type.getValue(o, k)
        type.map.set(k, val)
        console.log(`Added '${k}'`)
    }
}

async function loadAll() {
    console.log(`Loading YAML`)
    await Promise.all((await readdirR(ContentPath)).filter(v => v.endsWith(".yml")).map(v => loadFile(join(ContentPath, v))))
}

export default {
    loadAll,
}