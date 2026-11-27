"""Read-only final H36 GLB/step CPU audit; never renders or edits assets.

python tools/check-world-036.py --expected-world-sha FINAL_SHA256

The explicit hash gate prevents an intermediate bake from being silently
recorded as the final result. Only the requested QA JSON is written.
"""
import argparse, base64, hashlib, io, json, math, struct, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2),
              5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4,
          'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
IDENTITY = (1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
H29_BLOB = '82e9ce953fc1954c7408ebbc835dbab37098aa64'
H31_COMMIT = 'c0fdc9aaf53ac6378b261caf44aee840bddb23ac'
H35_BUNDLE = '098ee369a86f2358e0c49ae95e5785fc3f35536072947762d906cc7ec327672b'
NAV_SHA = '718d36ecfd682b85bf57939995da29375f955dc05ada671631a9571d651349ac'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def multiply(a, b):
    """glTF column-major matrix multiplication; world = parent * local."""
    return tuple(sum(a[k * 4 + row] * b[col * 4 + k] for k in range(4))
                 for col in range(4) for row in range(4))


def local_matrix(node):
    if 'matrix' in node:
        return tuple(node['matrix'])
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    sx, sy, sz = node.get('scale', [1, 1, 1])
    tx, ty, tz = node.get('translation', [0, 0, 0])
    return ((1 - 2*y*y - 2*z*z)*sx, (2*x*y + 2*z*w)*sx, (2*x*z - 2*y*w)*sx, 0,
            (2*x*y - 2*z*w)*sy, (1 - 2*x*x - 2*z*z)*sy, (2*y*z + 2*x*w)*sy, 0,
            (2*x*z + 2*y*w)*sz, (2*y*z - 2*x*w)*sz, (1 - 2*x*x - 2*y*y)*sz, 0,
            tx, ty, tz, 1)


def transform(m, p):
    return tuple(m[r]*p[0] + m[4+r]*p[1] + m[8+r]*p[2] + m[12+r]
                 for r in range(3))


class GLB:
    def __init__(self, path):
        self.path = path
        self.bytes = path.read_bytes()
        magic, version, length = struct.unpack_from('<4sII', self.bytes)
        assert magic == b'glTF' and version == 2 and length == len(self.bytes)
        offset, chunks = 12, []
        while offset < length:
            size, kind = struct.unpack_from('<I4s', self.bytes, offset)
            payload = self.bytes[offset + 8: offset + 8 + size]
            assert len(payload) == size
            chunks.append((kind, payload)); offset += size + 8
        assert offset == length and chunks[0][0] == b'JSON'
        self.doc = json.loads(chunks[0][1])
        self.buffers = []
        binary = next((p for k, p in chunks if k == b'BIN\0'), b'')
        for i, b in enumerate(self.doc.get('buffers', [])):
            if 'uri' not in b:
                assert i == 0
                data = binary
            elif b['uri'].startswith('data:'):
                data = base64.b64decode(b['uri'].split(',', 1)[1])
            else:
                data = self.local_file(b['uri']).read_bytes()
            assert len(data) >= b['byteLength']
            self.buffers.append(data)
        self.cache = {}
        self.view_bytes = sum(v['byteLength'] for v in self.doc.get('bufferViews', []))

    def local_file(self, uri):
        assert '://' not in uri and not uri.startswith('/'), 'External network assets not permitted'
        target = (self.path.parent / uri).resolve()
        assert target.is_relative_to(ROOT.resolve()), 'Asset path leaves repository'
        return target

    def decode(self, view_id, byte_offset, count, component, width, normalized=False):
        view = self.doc['bufferViews'][view_id]
        code, size = COMPONENTS[component]
        item_bytes = size * width
        stride = view.get('byteStride', item_bytes)
        assert stride >= item_bytes
        assert byte_offset + max(0, count-1)*stride + (item_bytes if count else 0) <= view['byteLength']
        start = view.get('byteOffset', 0) + byte_offset
        data = self.buffers[view['buffer']]
        assert view.get('byteOffset', 0) + view['byteLength'] <= len(data)
        fmt = '<' + code * width
        values = [struct.unpack_from(fmt, data, start + i*stride) for i in range(count)]
        if normalized and component != 5126:
            denom = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535, 5125: 4294967295}[component]
            values = [tuple(max(-1, v/denom) for v in q) for q in values]
        return values

    def accessor(self, index):
        if index in self.cache:
            return self.cache[index]
        a = self.doc['accessors'][index]
        width = WIDTHS[a['type']]
        if 'bufferView' in a:
            values = self.decode(a['bufferView'], a.get('byteOffset', 0), a['count'],
                                 a['componentType'], width, a.get('normalized', False))
        else:
            values = [(0,)*width for _ in range(a['count'])]
        if 'sparse' in a:
            s = a['sparse']; ix = s['indices']; val = s['values']
            indices = self.decode(ix['bufferView'], ix.get('byteOffset', 0), s['count'], ix['componentType'], 1)
            sparse = self.decode(val['bufferView'], val.get('byteOffset', 0), s['count'],
                                 a['componentType'], width, a.get('normalized', False))
            for (i,), p in zip(indices, sparse):
                assert 0 <= i < len(values)
                values[i] = p
        assert all(math.isfinite(v) for q in values for v in q), f'Non-finite accessor {index}'
        self.cache[index] = values
        return values

    def instances(self):
        nodes = self.doc.get('nodes', [])
        roots = self.doc['scenes'][self.doc.get('scene', 0)].get('nodes', [])
        def visit(index, parent, names):
            node = nodes[index]; world = multiply(parent, local_matrix(node))
            path = names + [node.get('name', f'node_{index}')]
            if 'mesh' in node:
                yield index, node, self.doc['meshes'][node['mesh']], world, path
            for child in node.get('children', []):
                yield from visit(child, world, path)
        for index in roots:
            yield from visit(index, IDENTITY, [])


def triangle_indices(primitive, glb):
    count = len(glb.accessor(primitive['attributes']['POSITION']))
    indices = [q[0] for q in glb.accessor(primitive['indices'])] if 'indices' in primitive else list(range(count))
    assert all(0 <= i < count for i in indices), 'Out-of-range mesh index'
    mode = primitive.get('mode', 4)
    if mode == 4:
        assert len(indices) % 3 == 0
        return [tuple(indices[i:i+3]) for i in range(0, len(indices), 3)]
    if mode == 5:
        return [(indices[i+1], indices[i], indices[i+2]) if i % 2 else tuple(indices[i:i+3])
                for i in range(len(indices)-2)]
    if mode == 6:
        return [(indices[0], indices[i], indices[i+1]) for i in range(1, len(indices)-1)]
    raise AssertionError(f'Non-triangle primitive mode {mode}')


def preservation(baseline_path):
    baseline = json.loads(baseline_path.read_text())
    index = (ROOT/'index.html').read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(index)).encode() + b'\0' + index).hexdigest()
    out = {'H29IndexGitBlob': blob, 'H29IndexExpectedGitBlob': H29_BLOB,
           'H29IndexUnchanged': blob == H29_BLOB,
           'H35BundleSHA256': sha((ROOT/'sample/dist/game-h35.js').read_bytes()),
           'H35BundleExpectedSHA256': H35_BUNDLE, 'H31ArchiveCommit': H31_COMMIT}
    out['H35BundleUnchanged'] = out['H35BundleSHA256'] == H35_BUNDLE
    h31 = []
    for file in sorted((ROOT/'sample-h31').glob('*')):
        if not file.is_file():
            continue
        original = subprocess.run(['git', 'show', f'{H31_COMMIT}:fengming-v2-scene-a/sample/{file.name}'],
                                  cwd=ROOT, capture_output=True, check=True).stdout
        h31.append({'file': str(file.relative_to(ROOT)), 'sha256': sha(file.read_bytes()),
                    'archiveSHA256': sha(original), 'unchanged': sha(file.read_bytes()) == sha(original)})
    assert h31, 'Missing H31 archive files'
    out['H31ArchiveFiles'] = h31
    out['H31ArchiveSourcesUnchanged'] = all(q['unchanged'] for q in h31)
    # Versioned old art and H35 launch chain must remain usable independently.
    files = {k: v for k, v in baseline.items() if k.startswith(('assets/gate-035/', 'assets/environment-035/',
             'assets/hero-035/')) or k in ('gate-h35.html', 'sample/dist/game-h35.js')}
    changed = []
    for name, expected in files.items():
        p = ROOT/name
        actual = sha(p.read_bytes()) if p.is_file() else None
        if actual != expected:
            changed.append({'file': name, 'expected': expected, 'actual': actual})
    out.update({'versioned035FilesChecked': len(files), 'versioned035FilesChanged': changed})
    out['pass'] = (out['H29IndexUnchanged'] and out['H35BundleUnchanged']
                   and out['H31ArchiveSourcesUnchanged'] and not changed)
    return out


def images_and_budget(glb):
    from PIL import Image
    result = []
    for i, image in enumerate(glb.doc.get('images', [])):
        if 'bufferView' in image:
            view = glb.doc['bufferViews'][image['bufferView']]
            data = glb.buffers[view['buffer']][view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
            location = 'embedded'
        elif image['uri'].startswith('data:'):
            data = base64.b64decode(image['uri'].split(',', 1)[1]); location = 'data-uri'
        else:
            file = glb.local_file(image['uri']); data = file.read_bytes(); location = str(file.relative_to(ROOT))
        with Image.open(io.BytesIO(data)) as decoded:
            w, h = decoded.size
            result.append({'image': i, 'name': image.get('name'), 'location': location,
                           'encodedBytes': len(data), 'sha256': sha(data),
                           'format': decoded.format, 'width': w, 'height': h,
                           'decodedRGBABytes': w*h*4,
                           'RGBAWithFullMipChainBytesEstimate': math.ceil(w*h*4*4/3)})
    # Decode every accessor, not only positions touched by the stair probe.
    for i in range(len(glb.doc.get('accessors', []))):
        glb.accessor(i)
    return {'GLBBytes': len(glb.bytes), 'meshCount': len(glb.doc.get('meshes', [])),
            'materialCount': len(glb.doc.get('materials', [])),
            'accessorCount': len(glb.doc.get('accessors', [])), 'allAccessorsFiniteAndInBounds': True,
            'bufferViewBytes': glb.view_bytes, 'images': result,
            'imageEncodedBytes': sum(q['encodedBytes'] for q in result),
            'texturePixels': sum(q['width']*q['height'] for q in result),
            'decodedRGBABytes': sum(q['decodedRGBABytes'] for q in result),
            'RGBAWithFullMipChainBytesEstimate': sum(q['RGBAWithFullMipChainBytesEstimate'] for q in result),
            'note': 'Actual counts, not a phone GPU/FPS certification. RGBA memory estimate excludes driver overhead.'}


def gate_steps(glb):
    triangles = []; batches = []; all_triangles = 0; primitives = 0
    for node_id, node, mesh, matrix, path in glb.instances():
        group = '/'.join(path)
        gate = 'H36_Gate' in group or 'H36_GATE' in group
        for primitive in mesh.get('primitives', []):
            tris = triangle_indices(primitive, glb); all_triangles += len(tris); primitives += 1
            if not gate:
                continue
            positions = [transform(matrix, p) for p in glb.accessor(primitive['attributes']['POSITION'])]
            selected = 0
            for indices in tris:
                a, b, c = [positions[i] for i in indices]
                minx, maxx = min(p[0] for p in (a,b,c)), max(p[0] for p in (a,b,c))
                minz, maxz = min(p[2] for p in (a,b,c)), max(p[2] for p in (a,b,c))
                if maxx < 1.35-2e-6 or minx > 2.45+2e-6 or maxz < -7.4-2e-6 or minz > -6.9+2e-6:
                    continue
                if min(p[1] for p in (a,b,c)) > 1.5 or max(p[1] for p in (a,b,c)) < -.1:
                    continue
                u = tuple(b[k]-a[k] for k in range(3)); v = tuple(c[k]-a[k] for k in range(3))
                normal = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
                length = math.sqrt(sum(q*q for q in normal))
                if length == 0 or normal[1]/length < .95:
                    continue
                triangles.append((a,b,c,minx,maxx,minz,maxz)); selected += 1
            batches.append({'node': node.get('name'), 'nodeIndex': node_id, 'path': path,
                            'worldMatrixColumnMajor': list(matrix), 'triangles': len(tris),
                            'upwardLowStairCandidates': selected})
    assert batches and triangles, 'H36_Gate group/real upward stair triangles not found'
    nav_bytes = (ROOT/'assets/sample-lod/navigation.json').read_bytes()
    assert sha(nav_bytes) == NAV_SHA, 'Original navigation cache changed'
    rows = json.loads(nav_bytes)['steps']; assert len(rows) == 21 and len(rows[0]) == 45
    # Spatial bins bound the CPU probe to local triangles; no render/BVH library.
    bins = {}; bin_size = .05
    for index, t in enumerate(triangles):
        a,b,c,minx,maxx,minz,maxz = t
        for ix in range(math.floor((minx-2e-6)/bin_size), math.floor((maxx+2e-6)/bin_size)+1):
            for iz in range(math.floor((minz-2e-6)/bin_size), math.floor((maxz+2e-6)/bin_size)+1):
                bins.setdefault((ix,iz), []).append(index)
    def height(x, z):
        best = None
        for index in bins.get((math.floor(x/bin_size), math.floor(z/bin_size)), []):
            a,b,c,minx,maxx,minz,maxz = triangles[index]
            if x < minx-2e-6 or x > maxx+2e-6 or z < minz-2e-6 or z > maxz+2e-6:
                continue
            denom = (b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2])
            if abs(denom) < 1e-15:
                continue
            u = ((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denom
            v = ((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denom
            w = 1-u-v
            if min(u,v,w) < -1e-4:
                continue
            y = u*a[1]+v*b[1]+w*c[1]
            if best is None or y > best:
                best = y
        return best
    samples = 0; centres = 0; total_error = 0; max_error = 0; missing = []; failures = []
    for iz, row in enumerate(rows):
        for ix, expected in enumerate(row):
            if expected is None or not math.isfinite(expected):
                continue
            for dx,dz in [(0,0),(-.31,-.29),(.33,.27),(-.27,.37),(.29,-.33)]:
                x=1.35+.025*(ix+dx); z=-7.4+.025*(iz+dz)
                if x<1.35 or x>2.45 or z< -7.4 or z> -6.9:
                    continue
                samples += 1; centres += int(dx == 0 and dz == 0)
                actual = height(x,z)
                if actual is None:
                    missing.append({'x':x,'z':z,'expected':expected}); continue
                error = abs(actual-expected); total_error += error; max_error = max(max_error,error)
                if error >= 1e-5:
                    failures.append({'x':x,'z':z,'expected':expected,'actual':actual,'error':error})
    assert samples == 4048 and centres == 850, 'Dense suite no longer matches original H35 coverage'
    return {'cacheSHA256':NAV_SHA,'cacheGrid':[45,21],'cacheCentreSamples':centres,'denseSamples':samples,
            'method':'Highest real upward-facing Y-up Gate triangle at original cache centres and four subcell offsets; node world matrices applied.',
            'triangleBarycentricEpsilon':1e-4,'xzBoundEpsilonMetres':2e-6,'heightToleranceMetres':1e-5,
            'maxAbsHeightErrorMetres':max_error,'meanAbsHeightErrorMetres':total_error/max(1,samples-len(missing)),
            'missingSamples':missing,'failuresAboveTolerance':failures,'candidateTriangles':len(triangles),
            'gateBatches':batches,'allSceneTriangles':all_triangles,'scenePrimitiveInstances':primitives,
            'pass':not missing and not failures and max_error<1e-5}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--world', type=Path, default=ROOT/'assets/scene-036/runtime/world-h36.glb')
    parser.add_argument('--expected-world-sha', required=True)
    parser.add_argument('--baseline', type=Path, default=Path('/workspace/qa-h36/baseline-preserved.json'))
    parser.add_argument('--output', type=Path, default=Path('/workspace/qa-h36/world-cpu.json'))
    args = parser.parse_args()
    assert len(args.expected_world_sha) == 64, 'Supply final frozen SHA256, not an intermediate label'
    glb = GLB(args.world)
    assert sha(glb.bytes) == args.expected_world_sha, 'World does not match the confirmed final asset'
    steps = gate_steps(glb); budget = images_and_budget(glb); frozen = preservation(args.baseline)
    assert sha(args.world.read_bytes()) == args.expected_world_sha, 'World changed during audit'
    report = {'revision':'H36','scope':'Read-only final GLB/real physical stair/old-version preservation CPU audit; no rendering or phone performance claim',
              'world':str(args.world.relative_to(ROOT)),'worldSHA256':args.expected_world_sha,
              'steps':steps,'preservation':frozen,'budget':budget,
              'pass':steps['pass'] and frozen['pass']}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'report':str(args.output),'pass':report['pass'],'worldSHA256':args.expected_world_sha,
          'denseSamples':steps['denseSamples'],'maxHeightError':steps['maxAbsHeightErrorMetres'],
          'missing':len(steps['missingSamples']),'heightFailures':len(steps['failuresAboveTolerance']),
          'oldVersionsUnchanged':frozen['pass'],'GLBBytes':budget['GLBBytes'],
          'sceneTriangles':steps['allSceneTriangles'],'texturePixels':budget['texturePixels']},ensure_ascii=False))
    raise SystemExit(0 if report['pass'] else 1)


if __name__ == '__main__':
    main()
