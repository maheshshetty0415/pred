const fs = require('fs');
const path = require('path');

// Ensure data folder exists
const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Thread-safe JSON file utilities
const readCollection = (name) => {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    } catch (e) {
        return [];
    }
};

const writeCollection = (name, data) => {
    const filePath = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
};

function createMockModel(modelName, schema) {
    const filename = modelName.toLowerCase();
    
    class ModelInstance {
        constructor(data) {
            if (schema && schema.definition) {
                for (const [key, fieldDef] of Object.entries(schema.definition)) {
                    if (data && data[key] !== undefined) {
                        // Apply setter if defined
                        if (fieldDef && typeof fieldDef.set === 'function') {
                            this[key] = fieldDef.set(data[key]);
                        } else {
                            this[key] = data[key];
                        }
                    }
                }
                // Copy metadata and other fields (e.g., _id, createdAt, updatedAt)
                if (data) {
                    for (const key of Object.keys(data)) {
                        if (this[key] === undefined) {
                            this[key] = data[key];
                        }
                    }
                }
            } else {
                Object.assign(this, data);
            }
            
            // Assign schema instance methods
            if (schema && schema.methods) {
                for (const [key, fn] of Object.entries(schema.methods)) {
                    this[key] = fn.bind(this);
                }
            }
        }

        async save(options) {
            const list = readCollection(filename);
            
            // Execute pre-save hooks
            if (schema && schema.preHooks && schema.preHooks['save']) {
                const next = () => {};
                await schema.preHooks['save'].call(this, next);
            }

            if (!this._id) {
                this._id = 'local_' + Math.random().toString(36).substring(2, 15);
                this.createdAt = new Date().toISOString();
                this.updatedAt = new Date().toISOString();
                list.push(this.toObject());
            } else {
                this.updatedAt = new Date().toISOString();
                const idx = list.findIndex(item => String(item._id) === String(this._id));
                if (idx !== -1) {
                    list[idx] = this.toObject();
                } else {
                    list.push(this.toObject());
                }
            }

            writeCollection(filename, list);
            return this;
        }

        toObject() {
            const obj = {};
            for (const key of Object.keys(this)) {
                if (typeof this[key] !== 'function') {
                    obj[key] = this[key];
                }
            }
            return obj;
        }

        toJSON() {
            const obj = this.toObject();
            if (schema && schema.definition) {
                for (const [key, fieldDef] of Object.entries(schema.definition)) {
                    if (fieldDef && typeof fieldDef.get === 'function' && obj[key] !== undefined) {
                        obj[key] = fieldDef.get(obj[key]);
                    }
                }
            }
            return obj;
        }

        isModified(field) {
            if (field === 'password') {
                if (!this.password) return false;
                // If already bcrypt hashed, do not re-hash
                if (this.password.startsWith('$2a$') || this.password.startsWith('$2b$')) {
                    return false;
                }
                return true;
            }
            return true;
        }
    }

    // Static model methods

    ModelInstance.create = async function(data) {
        const inst = new ModelInstance(data);
        await inst.save();
        return inst;
    };

    ModelInstance.findOne = function(query) {
        const list = readCollection(filename);
        const record = list.find(item => {
            return Object.entries(query).every(([key, value]) => {
                return String(item[key]) === String(value);
            });
        });

        if (!record) return null;
        
        const inst = new ModelInstance(record);

        // Chain methods for selections
        inst.select = function(fieldsStr) {
            return this;
        };
        
        inst.then = function(resolve) {
            return resolve(this);
        };

        return inst;
    };

    ModelInstance.findById = function(id) {
        const list = readCollection(filename);
        const record = list.find(item => String(item._id) === String(id));
        if (!record) return null;
        
        const inst = new ModelInstance(record);
        inst.then = function(resolve) {
            return resolve(this);
        };
        return inst;
    };

    ModelInstance.find = function(query = {}) {
        const list = readCollection(filename);
        
        let filtered = list;
        if (Object.keys(query).length > 0) {
            filtered = list.filter(item => {
                return Object.entries(query).every(([key, value]) => {
                    return String(item[key]) === String(value);
                });
            });
        }

        let instances = filtered.map(record => new ModelInstance(record));

        // Mongoose chain query emulation
        const chain = {
            select: function() { return this; },
            sort: function() { return this; },
            limit: function(n) {
                instances = instances.slice(0, n);
                return this;
            },
            populate: function() { return this; },
            then: function(resolve) {
                return resolve(instances);
            }
        };

        // Attach chain helpers to array directly
        instances.select = chain.select.bind(chain);
        instances.sort = chain.sort.bind(chain);
        instances.limit = chain.limit.bind(chain);
        instances.populate = chain.populate.bind(chain);
        instances.then = chain.then.bind(chain);

        return instances;
    };

    ModelInstance.countDocuments = async function(query = {}) {
        const list = readCollection(filename);
        if (Object.keys(query).length === 0) {
            return list.length;
        }

        let filtered = list.filter(item => {
            return Object.entries(query).every(([key, value]) => {
                if (value && typeof value === 'object') {
                    if (value.$gt !== undefined) {
                        return item[key] && new Date(item[key]).getTime() > new Date(value.$gt).getTime();
                    }
                    if (value.$gte !== undefined) {
                        return item[key] && new Date(item[key]).getTime() >= new Date(value.$gte).getTime();
                    }
                }
                return String(item[key]) === String(value);
            });
        });

        return filtered.length;
    };

    ModelInstance.deleteOne = async function(query) {
        let list = readCollection(filename);
        list = list.filter(item => {
            return !Object.entries(query).every(([key, value]) => {
                return String(item[key]) === String(value);
            });
        });
        writeCollection(filename, list);
        return { deletedCount: 1 };
    };

    return ModelInstance;
}

const mongoose = {
    Schema: class {
        constructor(definition, options) {
            this.definition = definition;
            this.options = options;
            this.methods = {};
            this.statics = {};
            this.preHooks = {};
        }
        pre(event, fn) {
            this.preHooks[event] = fn;
        }
        index(def) {
            // Mock index registration
        }
    },
    model(name, schema) {
        return createMockModel(name, schema);
    },
    connect: async () => {
        console.log("Mock Local Database connected successfully (Zero dependency offline JSON storage)!");
        return { connection: { host: 'Offline JSON Storage' } };
    },
    connection: {
        readyState: 1
    }
};

module.exports = mongoose;
