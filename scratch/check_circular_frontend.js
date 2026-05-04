const fs = require('fs');
const path = require('path');

function getImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const matches = content.match(/from\s+["'](\..*?)["']/g) || content.match(/import\(["'](\..*?)["']\)/g) || [];
    return matches.map(m => {
        const relativePath = m.match(/["'](\..*?)["']/)[1];
        let absolutePath = path.resolve(path.dirname(filePath), relativePath);
        if (!path.extname(absolutePath)) {
            const exts = ['.js', '.jsx', '.ts', '.tsx'];
            for (const ext of exts) {
                if (fs.existsSync(absolutePath + ext)) return absolutePath + ext;
            }
            if (fs.existsSync(path.join(absolutePath, 'index.js'))) return path.join(absolutePath, 'index.js');
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
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            checkCircular(fullPath);
        }
    }
}

scanDir(path.resolve('frontend/src'));
