const fs = require('fs');
const path = require('path');

function getImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(/require\(["'](\..*?)["']\)/g) || [];
    return matches.map(m => {
        const relativePath = m.match(/["'](\..*?)["']/)[1];
        let absolutePath = path.resolve(path.dirname(filePath), relativePath);
        if (!absolutePath.endsWith('.js')) {
            if (fs.existsSync(absolutePath + '.js')) absolutePath += '.js';
            else if (fs.existsSync(path.join(absolutePath, 'index.js'))) absolutePath = path.join(absolutePath, 'index.js');
        }
        return absolutePath;
    }).filter(p => fs.existsSync(p));
}

function checkCircular(startPath, visited = new Set(), stack = []) {
    if (stack.includes(startPath)) {
        console.log('Circular Dependency Found:', stack.slice(stack.indexOf(startPath)).concat(startPath).join(' -> '));
        return;
    }
    if (visited.has(startPath)) return;

    visited.add(startPath);
    stack.push(startPath);
    
    const imports = getImports(startPath);
    for (const imp of imports) {
        checkCircular(imp, visited, stack);
    }
    stack.pop();
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules') scanDir(fullPath);
        } else if (file.endsWith('.js')) {
            checkCircular(fullPath);
        }
    }
}

scanDir(path.resolve('backend/src'));
