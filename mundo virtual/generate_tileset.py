#!/usr/bin/env python3
"""
QuantumHive Town — Generador completo de assets cyberpunk v3
Colores BRILLANTES para que se vean contra fondo oscuro.
Genera: tileset, sprites de agentes, mapa JS, spritesheet data TS
"""
from PIL import Image, ImageDraw, ImageFont
import os, json, math

OUT = os.path.dirname(os.path.abspath(__file__))
T = 32  # tile size

# === PALETA CYBERPUNK v3 — MUCHO MAS BRILLANTE ===
C = {
    "bg":         (12, 12, 30),
    # Floor tiles — base mucho mas clara
    "floor1":     (55, 55, 95),
    "floor2":     (70, 70, 115),
    "floor3":     (85, 85, 130),
    "floor_grid": (80, 80, 130),
    "floor_glow": (100, 100, 150),
    # Walls — contraste fuerte
    "wall_d":     (40, 40, 80),
    "wall_m":     (65, 65, 110),
    "wall_l":     (90, 90, 140),
    "wall_top":   (110, 110, 160),
    # Neon
    "neon":       (0, 220, 255),
    "neon_bright":(80, 240, 255),
    "neon_d":     (0, 160, 210),
    "neon_glow":  (0, 100, 140),
    # Gold
    "gold":       (255, 220, 40),
    "gold_bright":(255, 240, 100),
    "gold_d":     (200, 160, 20),
    # Accent colors
    "green":      (40, 255, 120),
    "green_d":    (20, 180, 80),
    "red":        (255, 60, 60),
    "red_d":      (200, 40, 40),
    "blue":       (60, 140, 255),
    "blue_d":     (40, 100, 200),
    "purple":     (180, 100, 255),
    "purple_d":   (140, 70, 200),
    "cyan":       (0, 255, 240),
    "cyan_d":     (0, 200, 190),
    "orange":     (255, 160, 40),
    # Server/tech
    "srv1":       (60, 60, 110),
    "srv2":       (75, 75, 130),
    "srv_frame":  (95, 95, 150),
    "screen_bg":  (20, 35, 70),
    "screen_glow":(30, 50, 90),
    # Furniture
    "desk":       (80, 65, 110),
    "desk_t":     (100, 85, 130),
    "desk_edge":  (120, 105, 150),
    "chair":      (50, 40, 75),
    "chair_t":    (70, 60, 95),
    # Character
    "white":      (240, 240, 250),
    "skin":       (220, 190, 160),
    "skin_shad":  (190, 160, 130),
    "shadow":     (15, 15, 35),
    "black":      (5, 5, 15),
}

def r(d, x1,y1,x2,y2,c): d.rectangle([x1,y1,x2,y2], fill=c)
def p(d, x,y,c): d.point((x,y), fill=c)
def l(d, x1,y1,x2,y2,c,w=1): d.line([x1,y1,x2,y2], fill=c, width=w)

# ================================================================
# TILESET: 16 columnas x 4 filas = 64 tiles de 32x32
# ================================================================

def tile_floor(d, ox, oy):
    """Suelo base cyberpunk con grid brillante"""
    r(d, ox,oy,ox+31,oy+31, C["floor1"])
    # Grid lines
    for i in range(0,32,8):
        l(d, ox,oy+i,ox+31,oy+i, C["floor_grid"])
        l(d, ox+i,oy,ox+i,oy+31, C["floor_grid"])
    # Center accent
    r(d, ox+14,oy+14,ox+17,oy+17, C["floor3"])
    # Corner accents
    for cx,cy in [(2,2),(29,2),(2,29),(29,29)]:
        p(d, ox+cx, oy+cy, C["floor_glow"])

def tile_floor_neon(d, ox, oy):
    """Suelo con linea neon central brillante"""
    tile_floor(d, ox, oy)
    # Neon line through center
    l(d, ox,oy+15,ox+31,oy+15, C["neon"], 2)
    l(d, ox,oy+16,ox+31,oy+16, C["neon_d"])
    # Glow effect
    for dx in range(-2,3):
        p(d, ox+15+dx, oy+14, C["neon_glow"])
        p(d, ox+15+dx, oy+17, C["neon_glow"])

def tile_wall(d, ox, oy):
    """Pared cyberpunk con franja neon"""
    r(d, ox,oy,ox+31,oy+31, C["wall_d"])
    # Top face
    r(d, ox,oy,ox+31,oy+5, C["wall_top"])
    r(d, ox,oy+1,ox+31,oy+4, C["wall_m"])
    # Neon stripe
    r(d, ox,oy+6,ox+31,oy+7, C["neon"])
    r(d, ox,oy+8,ox+31,oy+8, C["neon_d"])
    # Bottom shadow
    r(d, ox,oy+28,ox+31,oy+31, C["shadow"])
    # Edge highlights
    l(d, ox,oy,ox,oy+27, C["wall_l"])
    l(d, ox+31,oy,ox+31,oy+27, C["wall_l"])

def tile_wall_gold(d, ox, oy):
    """Pared con ornamento dorado"""
    tile_wall(d, ox, oy)
    r(d, ox+10,oy+10,ox+21,oy+24, C["wall_m"])
    r(d, ox+11,oy+11,ox+20,oy+23, C["gold_d"])
    r(d, ox+12,oy+12,ox+19,oy+22, C["gold"])
    # Glow
    r(d, ox+13,oy+13,ox+18,oy+21, C["gold_bright"])

def tile_server(d, ox, oy):
    """Rack de servidor con luces LED"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    # Rack frame
    r(d, ox+3,oy+1,ox+28,oy+30, C["srv_frame"])
    r(d, ox+4,oy+2,ox+27,oy+29, C["srv2"])
    # Server trays
    for i in range(4):
        y = oy+3+i*6
        r(d, ox+5,y,ox+26,y+4, C["srv1"])
        r(d, ox+6,y+1,ox+25,y+3, C["srv2"])
        # LED indicators — bright colors
        led_colors = [C["green"],C["blue"],C["neon"],C["green"]]
        p(d, ox+24,y+2, led_colors[i])
        p(d, ox+22,y+2, C["green"])
        p(d, ox+20,y+2, C["red"])
        # Vent lines
        for vx in range(7,18,2):
            l(d, vx+ox, y+2, vx+ox, y+2, C["srv_frame"])
    # Side rails
    l(d, ox+3,oy+1,ox+3,oy+30, C["wall_l"])
    l(d, ox+28,oy+1,ox+28,oy+30, C["wall_l"])

def tile_screen(d, ox, oy):
    """Monitor cyberpunk con codigo"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    # Monitor frame
    r(d, ox+1,oy+2,ox+30,oy+24, C["wall_l"])
    r(d, ox+2,oy+3,ox+29,oy+23, C["screen_bg"])
    # Screen content — code lines
    for i in range(5):
        y = oy+5+i*4
        w = 8 + (i%3)*5
        color = C["neon"] if i%2==0 else C["green"]
        r(d, ox+4,y,ox+4+w,y+1, color)
    # Top bar
    r(d, ox+2,oy+3,ox+29,oy+4, C["neon"])
    # Stand
    r(d, ox+12,oy+24,ox+19,oy+27, C["wall_m"])
    r(d, ox+8,oy+27,ox+23,oy+29, C["wall_d"])

def tile_screen_chart(d, ox, oy):
    """Monitor con grafico de barras"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    r(d, ox+1,oy+1,ox+30,oy+23, C["wall_l"])
    r(d, ox+2,oy+2,ox+29,oy+22, C["screen_bg"])
    # Chart bars
    bars = [10,16,12,20,14,22,18,8,15]
    for i,h in enumerate(bars):
        x = ox+4+i*3
        color = C["neon"] if i%2==0 else C["gold"]
        r(d, x,oy+22-h,x+2,oy+22, color)
    # Title bar
    r(d, ox+2,oy+2,ox+29,oy+3, C["gold"])
    # Stand
    r(d, ox+12,oy+23,ox+19,oy+26, C["wall_m"])
    r(d, ox+8,oy+26,ox+23,oy+28, C["wall_d"])

def tile_desk(d, ox, oy):
    """Escritorio con monitor"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    # Desk surface
    r(d, ox+1,oy+14,ox+30,oy+17, C["desk_edge"])
    r(d, ox+1,oy+17,ox+30,oy+22, C["desk_t"])
    r(d, ox+2,oy+22,ox+29,oy+23, C["desk"])
    # Legs
    r(d, ox+3,oy+23,ox+5,oy+29, C["desk"])
    r(d, ox+26,oy+23,ox+28,oy+29, C["desk"])
    # Monitor on desk
    r(d, ox+9,oy+5,ox+23,oy+13, C["wall_l"])
    r(d, ox+10,oy+6,ox+22,oy+12, C["screen_bg"])
    # Code on screen
    for i in range(3):
        r(d, ox+12,oy+7+i*2,ox+12+(6+i*2),oy+7+i*2, C["neon"])
    # Monitor stand
    r(d, ox+14,oy+13,ox+18,oy+14, C["wall_m"])

def tile_chair(d, ox, oy):
    """Silla de oficina"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    # Seat
    r(d, ox+8,oy+16,ox+23,oy+21, C["chair_t"])
    r(d, ox+9,oy+17,ox+22,oy+20, C["chair"])
    # Backrest
    r(d, ox+8,oy+8,ox+23,oy+16, C["chair_t"])
    r(d, ox+9,oy+9,ox+22,oy+15, C["chair"])
    # Wheels
    r(d, ox+10,oy+21,ox+12,oy+27, C["wall_d"])
    r(d, ox+19,oy+21,ox+21,oy+27, C["wall_d"])
    # Wheel glow
    p(d, ox+11, oy+27, C["neon_d"])
    p(d, ox+20, oy+27, C["neon_d"])

def tile_cable(d, ox, oy):
    """Cables en el suelo con glow"""
    r(d, ox,oy,ox+31,oy+31, C["floor1"])
    for i in range(3):
        y = oy+8+i*8
        for x in range(ox+2,ox+30,2):
            p(d, x,y, C["floor2"])
            glow = C["neon"] if (x+oy)%12<4 else C["neon_glow"]
            p(d, x+1,y, glow)
    # Junction box
    r(d, ox+13,oy+10,ox+18,oy+20, C["wall_d"])
    r(d, ox+14,oy+11,ox+17,oy+19, C["neon"])

def tile_plant(d, ox, oy):
    """Planta decorativa cyberpunk"""
    r(d, ox,oy,ox+31,oy+31, C["floor1"])
    # Pot
    r(d, ox+10,oy+20,ox+21,oy+28, C["desk"])
    r(d, ox+9,oy+20,ox+22,oy+21, C["desk_t"])
    # Leaves — neon green
    leaves = [(-2,-5),(0,-7),(2,-5),(3,-3),(-3,-3),(-1,-8),(1,-8),(0,-4)]
    for dx,dy in leaves:
        p(d, ox+15+dx, oy+20+dy, C["green"])
    # Glow
    p(d, ox+15, oy+12, C["green_d"])

def tile_quantum(d, ox, oy):
    """Nucleo quantum central — hexagono brillante"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    cx,cy = ox+16,oy+16
    # Outer ring
    for rad,color in [(14,C["gold"]),(12,C["neon"]),(9,C["gold"]),(6,C["neon"]),(3,C["gold_bright"])]:
        for a in range(0,360,8):
            x = int(cx+rad*math.cos(math.radians(a)))
            y = int(cy+rad*math.sin(math.radians(a)))
            p(d, x,y, color)
    # Center
    r(d, cx-2,cy-2,cx+2,cy+2, C["gold_bright"])
    r(d, cx-1,cy-1,cx+1,cy+1, C["white"])

def tile_portal(d, ox, oy):
    """Portal dimension"""
    r(d, ox,oy,ox+31,oy+31, C["bg"])
    cx,cy = ox+16,oy+16
    for rad in [14,11,8,5]:
        color = C["neon"] if rad%3==0 else C["purple"]
        for a in range(0,360,8):
            x = int(cx+rad*math.cos(math.radians(a)))
            y = int(cy+rad*math.sin(math.radians(a)))
            p(d, x,y, color)
    r(d, cx-2,cy-2,cx+2,cy+2, C["cyan"])

# Dept wall tiles (fila 2)
DEPT_COLORS = {
    "orchestration": C["neon"],
    "appfactory":    C["green"],
    "analytics":     C["gold"],
    "comms":         C["cyan"],
    "server":        C["blue"],
    "learning":      C["purple"],
    "portal":        C["gold"],
    "meeting":       C["red"],
}

def tile_dept_wall(d, ox, oy, color):
    """Pared de departamento con indicador de color"""
    r(d, ox,oy,ox+31,oy+31, C["wall_d"])
    r(d, ox,oy,ox+31,oy+5, C["wall_top"])
    r(d, ox,oy+1,ox+31,oy+4, C["wall_m"])
    # Color stripe
    r(d, ox,oy+6,ox+31,oy+8, color)
    # Department indicator
    r(d, ox+13,oy+12,ox+18,oy+19, color)
    r(d, ox+14,oy+13,ox+17,oy+18, C["wall_d"])
    # Bottom shadow
    r(d, ox,oy+28,ox+31,oy+31, C["shadow"])
    # Edges
    l(d, ox,oy,ox,oy+27, C["wall_l"])
    l(d, ox+31,oy,ox+31,oy+27, C["wall_l"])

# ================================================================
# SPRITESHEET: 6 agentes, cada uno 4 dirs x 3 frames
# ================================================================

AGENT_COLORS = {
    "Hermes":       {"body":(0,200,240),  "acc":(255,220,50),  "hair":(220,220,240), "glow":(0,150,200)},
    "Dev_01":       {"body":(30,200,120),  "acc":(50,255,180),  "hair":(50,50,70),    "glow":(20,150,90)},
    "Marketing_01": {"body":(200,60,150),  "acc":(255,120,210), "hair":(70,40,60),    "glow":(160,40,120)},
    "Design_01":    {"body":(170,100,240), "acc":(210,160,255), "hair":(40,30,60),    "glow":(130,70,200)},
    "Investigador": {"body":(240,200,50),  "acc":(255,255,120), "hair":(60,50,40),    "glow":(200,160,30)},
    "OpenClaw_Bot": {"body":(100,100,130), "acc":(0,220,255),   "hair":(30,30,45),    "glow":(0,160,200)},
}

def draw_agent_frame(d, ox, oy, direction, frame, colors):
    """Dibuja un frame de 32x32 de un agente — mas detallado"""
    body, acc, hair, glow = colors["body"], colors["acc"], colors["hair"], colors["glow"]
    
    wo = 0
    if frame == 1: wo = -1
    if frame == 2: wo = 1
    
    # Shadow
    r(d, ox+10,oy+28,ox+21,oy+31, C["shadow"])
    
    # Legs
    if direction in ["down","up"]:
        r(d, ox+12+wo,oy+24,ox+14+wo,oy+28, body)
        r(d, ox+17-wo,oy+24,ox+19-wo,oy+28, body)
    else:
        r(d, ox+12,oy+24,ox+14,oy+28, body)
        r(d, ox+17,oy+24,ox+19,oy+28, body)
    
    # Shoes — neon glow
    r(d, ox+12+wo,oy+28,ox+14+wo,oy+30, acc)
    r(d, ox+17-wo,oy+28,ox+19-wo,oy+30, acc)
    
    # Body
    r(d, ox+10,oy+12,ox+21,oy+24, body)
    # Neon belt
    r(d, ox+10,oy+18,ox+21,oy+19, acc)
    # Body highlight
    r(d, ox+11,oy+13,ox+13,oy+17, glow)
    
    # Arms
    if direction == "left":
        r(d, ox+7,oy+13,ox+10,oy+20, body)
        r(d, ox+7,oy+13,ox+8,oy+15, glow)
    elif direction == "right":
        r(d, ox+21,oy+13,ox+24,oy+20, body)
        r(d, ox+23,oy+13,ox+24,oy+15, glow)
    
    # Head
    r(d, ox+11,oy+3,ox+20,oy+11, C["skin"])
    r(d, ox+11,oy+2,ox+20,oy+5, hair)
    # Hair highlight
    r(d, ox+12,oy+2,ox+14,oy+4, C["wall_l"])
    
    # Eyes based on direction
    if direction == "down":
        p(d, ox+13,oy+7, C["white"]); p(d, ox+17,oy+7, C["white"])
        p(d, ox+13,oy+8, acc); p(d, ox+17,oy+8, acc)
    elif direction == "up":
        r(d, ox+12,oy+4,ox+19,oy+6, hair)
    elif direction == "left":
        p(d, ox+12,oy+7, C["white"]); p(d, ox+12,oy+8, acc)
    elif direction == "right":
        p(d, ox+18,oy+7, C["white"]); p(d, ox+18,oy+8, acc)

def gen_spritesheet():
    agents = list(AGENT_COLORS.keys())
    n = len(agents)
    img = Image.new("RGBA", (n*3*T, 4*T), (0,0,0,0))
    d = ImageDraw.Draw(img)
    
    dirs = ["down","left","right","up"]
    for ai, name in enumerate(agents):
        colors = AGENT_COLORS[name]
        for di, direction in enumerate(dirs):
            for frame in range(3):
                ox = ai*3*T + frame*T
                oy = di*T
                draw_agent_frame(d, ox, oy, direction, frame, colors)
    return img

# ================================================================
# MAP DATA
# ================================================================
def gen_map_js(path, w, h):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    with open(path, "w") as f:
        f.write('// QuantumHive HQ Map — Auto-generated v3\n')
        f.write('export const tilesetpath = "/ai-town/assets/quantumhive-tileset.png";\n')
        f.write('export const tiledim = 32;\n')
        f.write(f'export const screenxtiles = {w};\n')
        f.write(f'export const screenytiles = {h};\n')
        f.write(f'export const tilesetpxw = {16*T};\n')
        f.write(f'export const tilesetpxh = {4*T};\n\n')
        
        # bgtiles[layer][x][y] — column-major
        f.write('export const bgtiles = [\n')
        # Layer 0: floor
        f.write('  [\n')
        for x in range(w):
            col = []
            for y in range(h):
                # Neon cross paths
                if x in [22,23]:
                    col.append(1)  # floor_neon
                elif y in [17,18]:
                    col.append(1)  # floor_neon
                else:
                    col.append(0)  # floor
            f.write('   [' + ','.join(str(v) for v in col) + '],\n')
        f.write('  ],\n')
        # Layer 1: empty
        f.write('  [\n')
        for x in range(w):
            f.write('   [' + ','.join(['-1']*h) + '],\n')
        f.write('  ],\n')
        f.write('];\n\n')
        
        # objmap — column-major
        f.write('export const objmap = [\n')
        f.write('  [\n')
        for x in range(w):
            col = []
            for y in range(h):
                val = -1
                # Outer walls
                if y <= 2 or y >= h-3 or x <= 2 or x >= w-3:
                    val = 2
                # Top departments
                elif 4 <= y <= 8:
                    if 4 <= x <= 13: val = 20   # Agent Orchestration
                    elif 16 <= x <= 28: val = 21  # App Factory
                    elif 32 <= x <= 42: val = 22  # Data & Analytics
                # Right side
                elif 9 <= y <= 20 and x >= 41:
                    val = 23  # Communication Hub
                # Bottom departments
                elif y >= 28:
                    if 4 <= x <= 13: val = 26   # Portal
                    elif 16 <= x <= 28: val = 25  # Learning
                    elif 35 <= x <= 42: val = 24  # Server Farm
                # Left side
                elif 9 <= y <= 20 and x <= 4:
                    val = 27  # Meeting
                # Center — quantum core area (empty for walking)
                else:
                    val = -1
                col.append(val)
            f.write('   [' + ','.join(str(v) for v in col) + '],\n')
        f.write('  ],\n')
        # Layer 2: empty
        f.write('  [\n')
        for x in range(w):
            f.write('   [' + ','.join(['-1']*h) + '],\n')
        f.write('  ],\n')
        f.write('];\n\n')
        
        f.write('export const animatedsprites = [];\n\n')
        f.write(f'export const mapwidth = bgtiles[0].length;\n')
        f.write(f'export const mapheight = bgtiles[0][0].length;\n')

# ================================================================
# SPRITESHEET DATA TS
# ================================================================
def gen_spritesheet_ts(name, col_idx):
    frames = {}
    animations = {}
    
    dirs = [("down",0),("left",1),("right",2),("up",3)]
    for dir_name, dir_y in dirs:
        dir_frames = []
        for fi in range(3):
            fname = f"{dir_name}{fi+1}" if fi > 0 else dir_name
            x = col_idx * 96 + fi * 32
            y = dir_y * 32
            frames[fname] = {
                "frame": {"x": x, "y": y, "w": 32, "h": 32},
                "sourceSize": {"w": 32, "h": 32},
                "spriteSourceSize": {"x": 0, "y": 0}
            }
            dir_frames.append(fname)
        animations[dir_name] = dir_frames
    
    return f'''import {{ SpritesheetData }} from './types';

export const data: SpritesheetData = {{
  frames: {json.dumps(frames, indent=4)},
  meta: {{
    scale: '1',
  }},
  animations: {json.dumps(animations, indent=4)},
}};
'''

# ================================================================
# MAIN
# ================================================================
def main():
    print("=== QuantumHive Town — Generador Cyberpunk v3 ===\n")
    
    # 1. TILESET
    print("[1/4] Generando tileset...")
    tileset = Image.new("RGBA", (16*T, 4*T), (0,0,0,0))
    td = ImageDraw.Draw(tileset)
    
    # Fila 0: suelos y paredes
    tile_floor(td, 0*T, 0)        # 0
    tile_floor_neon(td, 1*T, 0)   # 1
    tile_wall(td, 2*T, 0)         # 2
    tile_wall_gold(td, 3*T, 0)    # 3
    tile_server(td, 4*T, 0)       # 4
    tile_screen(td, 5*T, 0)       # 5
    tile_screen_chart(td, 6*T, 0) # 6
    tile_desk(td, 7*T, 0)         # 7
    tile_chair(td, 8*T, 0)        # 8
    tile_cable(td, 9*T, 0)        # 9
    tile_plant(td, 10*T, 0)       # 10
    tile_quantum(td, 11*T, 0)     # 11
    tile_portal(td, 12*T, 0)      # 12
    tile_floor(td, 13*T, 0)       # 13
    tile_floor_neon(td, 14*T, 0)  # 14
    tile_wall(td, 15*T, 0)        # 15
    
    # Fila 1: mas objetos
    tile_server(td, 0*T, T)       # 16
    tile_screen(td, 1*T, T)       # 17
    tile_screen_chart(td, 2*T, T) # 18
    tile_desk(td, 3*T, T)         # 19
    tile_chair(td, 4*T, T)        # 20
    tile_cable(td, 5*T, T)        # 21
    tile_plant(td, 6*T, T)        # 22
    tile_quantum(td, 7*T, T)      # 23
    tile_portal(td, 8*T, T)       # 24
    tile_floor(td, 9*T, T)        # 25
    tile_floor_neon(td, 10*T, T)  # 26
    tile_wall(td, 11*T, T)        # 27
    tile_wall_gold(td, 12*T, T)   # 28
    tile_server(td, 13*T, T)      # 29
    tile_screen(td, 14*T, T)      # 30
    tile_desk(td, 15*T, T)        # 31
    
    # Fila 2: paredes de departamento
    dept_list = ["orchestration","appfactory","analytics","comms","server","learning","portal","meeting"]
    for i, dept in enumerate(dept_list):
        tile_dept_wall(td, i*T, 2*T, DEPT_COLORS[dept])
    for i in range(8, 16):
        tile_floor(td, i*T, 2*T)
    
    # Fila 3: variaciones
    for i in range(16):
        tile_floor(td, i*T, 3*T)
    
    ts_path = os.path.join(OUT, "public", "assets", "quantumhive-tileset.png")
    os.makedirs(os.path.dirname(ts_path), exist_ok=True)
    tileset.save(ts_path)
    print(f"   -> {ts_path} ({tileset.size[0]}x{tileset.size[1]})")
    
    # 2. SPRITES
    print("[2/4] Generando sprites de agentes...")
    spritesheet = gen_spritesheet()
    sp_path = os.path.join(OUT, "public", "assets", "agent-sprites.png")
    spritesheet.save(sp_path)
    print(f"   -> {sp_path} ({spritesheet.size[0]}x{spritesheet.size[1]})")
    
    # 3. SPRITESHEET DATA TS
    print("[3/4] Generando spritesheet data...")
    agents = list(AGENT_COLORS.keys())
    ss_dir = os.path.join(OUT, "data", "spritesheets")
    os.makedirs(ss_dir, exist_ok=True)
    
    agent_chars = ["f1","f2","f3","f4","f5","f6"]
    for i, (agent_name, char_name) in enumerate(zip(agents, agent_chars)):
        ts_content = gen_spritesheet_ts(agent_name, i)
        ts_file = os.path.join(ss_dir, f"{char_name}.ts")
        with open(ts_file, "w") as f:
            f.write(ts_content)
        print(f"   -> {ts_file}")
    
    # 4. MAPA JS
    print("[4/4] Generando mapa...")
    MAP_W, MAP_H = 45, 36
    map_path = os.path.join(OUT, "data", "quantumhive.js")
    gen_map_js(map_path, MAP_W, MAP_H)
    print(f"   -> {map_path}")
    
    # 5. MAPA VISUAL (preview)
    print("   Generando preview del mapa...")
    map_img = Image.new("RGBA", (MAP_W*T, MAP_H*T), C["bg"])
    md = ImageDraw.Draw(map_img)
    
    # Suelo base
    for y in range(MAP_H):
        for x in range(MAP_W):
            tile_floor(md, x*T, y*T)
    
    # Neon paths
    for x in range(MAP_W):
        tile_floor_neon(md, x*T, 17*T)
        tile_floor_neon(md, x*T, 18*T)
    for y in range(MAP_H):
        tile_floor_neon(md, 22*T, y*T)
        tile_floor_neon(md, 23*T, y*T)
    
    # Quantum core
    for dx in range(-4,5):
        for dy in range(-4,5):
            if abs(dx)+abs(dy) <= 5:
                tile_quantum(md, (22+dx)*T, (18+dy)*T)
    
    # Dept walls
    for x in range(2,14):
        tile_dept_wall(md, x*T, 2*T, C["neon"])
        tile_dept_wall(md, x*T, 3*T, C["neon"])
    for y in range(2,10):
        tile_dept_wall(md, 2*T, y*T, C["neon"])
        tile_dept_wall(md, 3*T, y*T, C["neon"])
    
    for x in range(15,29):
        tile_dept_wall(md, x*T, 2*T, C["green"])
        tile_dept_wall(md, x*T, 3*T, C["green"])
    
    for x in range(32,43):
        tile_dept_wall(md, x*T, 2*T, C["gold"])
        tile_dept_wall(md, x*T, 3*T, C["gold"])
    
    for y in range(10,20):
        tile_dept_wall(md, 41*T, y*T, C["cyan"])
        tile_dept_wall(md, 42*T, y*T, C["cyan"])
    
    for x in range(35,43):
        tile_dept_wall(md, x*T, 29*T, C["blue"])
        tile_dept_wall(md, x*T, 30*T, C["blue"])
    for y in range(26,31):
        tile_dept_wall(md, 42*T, y*T, C["blue"])
        tile_dept_wall(md, 43*T, y*T, C["blue"])
    
    for x in range(15,29):
        tile_dept_wall(md, x*T, 32*T, C["purple"])
        tile_dept_wall(md, x*T, 33*T, C["purple"])
    
    for x in range(2,14):
        tile_dept_wall(md, x*T, 32*T, C["gold"])
        tile_dept_wall(md, x*T, 33*T, C["gold"])
    for y in range(24,34):
        tile_dept_wall(md, 2*T, y*T, C["gold"])
        tile_dept_wall(md, 3*T, y*T, C["gold"])
    
    for y in range(10,20):
        tile_dept_wall(md, 2*T, y*T, C["red"])
        tile_dept_wall(md, 3*T, y*T, C["red"])
    
    # Muebles
    for x in range(36,42):
        for y in range(27,30):
            tile_server(md, x*T, y*T)
    for x in range(33,42,3):
        tile_screen_chart(md, x*T, 4*T)
    for x in range(17,27,3):
        tile_desk(md, x*T, 5*T)
        tile_chair(md, (x+1)*T, 5*T)
    for x in range(5,11,3):
        tile_portal(md, x*T, 28*T)
    tile_screen(md, 4*T, 12*T)
    tile_screen(md, 8*T, 12*T)
    for x in range(5,40,4):
        tile_cable(md, x*T, 17*T)
    for pos in [(5,6),(10,6),(35,6),(40,6),(5,28),(10,28),(35,28),(40,28)]:
        tile_plant(md, pos[0]*T, pos[1]*T)
    
    # Labels
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except:
        font = ImageFont.load_default()
    
    labels = [
        (5,1,"AGENT ORCHESTRATION CENTER",C["neon"]),
        (20,1,"APP FACTORY",C["green"]),
        (35,1,"DATA & ANALYTICS LAB",C["gold"]),
        (41,9,"COMMUNICATION HUB",C["cyan"]),
        (36,25,"SERVER FARM",C["blue"]),
        (20,31,"LEARNING & UPGRADE HUB",C["purple"]),
        (4,31,"PORTAL / ENERGY CORE",C["gold"]),
        (3,9,"MEETING & STRATEGY ROOM",C["red"]),
    ]
    for lx,ly,label,color in labels:
        md.text((lx*T, ly*T), label, fill=color, font=font)
    
    cx,cy = 22*T, 18*T
    md.text((cx-50, cy-20), "QUANTUMHIVE", fill=C["gold"], font=font)
    md.text((cx-40, cy), "AI ORCHESTRATION", fill=C["neon"], font=font)
    md.text((cx-20, cy+20), "IA TOWN", fill=C["cyan"], font=font)
    
    preview_path = os.path.join(OUT, "public", "assets", "quantumhive-hq-preview.png")
    map_img.save(preview_path)
    print(f"   -> {preview_path}")
    
    print("\n=== COMPLETADO ===")
    print(f"Tileset: 16x4 tiles (64 tiles de 32x32)")
    print(f"Agentes: {len(agents)} sprites ({spritesheet.size[0]}x{spritesheet.size[1]})")
    print(f"Mapa: {MAP_W}x{MAP_H} tiles ({MAP_W*T}x{MAP_H*T} px)")

if __name__ == "__main__":
    main()
