import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from PIL import Image, ImageDraw, ImageFont
import os

SIGMA = 10
RHO = 28
BETA = 8.0 / 3.0


def lorenz(state):
    x, y, z = state
    return np.array([SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z])


def rk4_step(state, dt):
    k1 = lorenz(state)
    k2 = lorenz(state + 0.5 * dt * k1)
    k3 = lorenz(state + 0.5 * dt * k2)
    k4 = lorenz(state + dt * k3)
    return state + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)


dt = 0.005

num_steps = 40000
data = np.zeros((num_steps, 3))
data[0] = [0.1, 0.0, 0.0]
for i in range(num_steps - 1):
    data[i + 1] = rk4_step(data[i], dt)
xs, ys, zs = data[:, 0], data[:, 1], data[:, 2]

trans_steps_full = 5000
trans_full = np.zeros((trans_steps_full, 3))
trans_full[0] = [40.0, -40.0, 10.0]
for i in range(trans_steps_full - 1):
    trans_full[i + 1] = rk4_step(trans_full[i], dt)

trim = 40
txs = trans_full[trim:, 0]
tys = trans_full[trim:, 1]
tzs = trans_full[trim:, 2]
trans_steps = len(txs)

BG = "#ffffff"
fig = plt.figure(figsize=(14, 11), facecolor=BG)
ax = fig.add_axes([0.0, 0.0, 1.0, 1.0], projection="3d", facecolor=BG)

all_x = np.concatenate([xs, txs])
all_y = np.concatenate([ys, tys])
all_z = np.concatenate([zs, tzs])

x_span = all_x.max() - all_x.min()
y_span = all_y.max() - all_y.min()
z_span = all_z.max() - all_z.min()
m = 0.04
xl = (all_x.min() - m * x_span, all_x.max() + m * x_span)
yl = (all_y.min() - m * y_span, all_y.max() + m * y_span)
zl = (all_z.min() - m * z_span, all_z.max() + m * z_span)
ax.set_xlim(*xl)
ax.set_ylim(*yl)
ax.set_zlim(*zl)

try:
    ax.set_box_aspect([xl[1] - xl[0], yl[1] - yl[0], zl[1] - zl[0]])
except Exception:
    pass

ax.set_axis_off()
ax.view_init(elev=25, azim=-55)

origin = [xl[0], yl[0], zl[0]]
axis_color = "#374151"
tick_color = "#6b7280"
label_color = "#111827"
lw = 2.0

def draw_axis(start, end, label, tick_vals, tick_dim, label_sign):
    ax.plot(
        [start[0], end[0]],
        [start[1], end[1]],
        [start[2], end[2]],
        color=axis_color, linewidth=lw, alpha=0.8,
    )
    ax.text(
        end[0] + label_sign[0] * 3,
        end[1] + label_sign[1] * 3,
        end[2] + label_sign[2] * 3,
        label,
        color=label_color,
        fontsize=22,
        fontweight="bold",
    )
    for tv in tick_vals:
        pt = list(start)
        pt[tick_dim] = tv
        offset = [0, 0, 0]
        other = [d for d in range(3) if d != tick_dim]
        offset[other[0]] = label_sign[other[0]] * 1.5
        offset[other[1]] = label_sign[other[1]] * 1.5
        ax.text(
            pt[0] + offset[0],
            pt[1] + offset[1],
            pt[2] + offset[2],
            str(int(tv)),
            color=tick_color,
            fontsize=12,
            ha="center",
        )

x_ticks = np.arange(-20, 60, 10)
y_ticks = np.arange(-30, 60, 10)
z_ticks = np.arange(0, 51, 10)
draw_axis(origin, [xl[1], yl[0], zl[0]], "X", x_ticks, 0, [0, -1, -1])
draw_axis(origin, [xl[0], yl[1], zl[0]], "Y", y_ticks, 1, [-1, 0, -1])
draw_axis(origin, [xl[0], yl[0], zl[1]], "Z", z_ticks, 2, [-1, -1, 0])

cmap = LinearSegmentedColormap.from_list(
    "lorenz", ["#0891b2", "#2563eb", "#7c3aed", "#db2777"]
)
t = np.linspace(0, 1, num_steps - 1)

skip = 50
for i in range(0, num_steps - 1 - skip, skip):
    color = cmap(t[i])
    ax.plot(
        xs[i : i + skip + 1],
        ys[i : i + skip + 1],
        zs[i : i + skip + 1],
        color=color,
        alpha=0.55,
        linewidth=0.5,
    )

trans_cmap = LinearSegmentedColormap.from_list(
    "trans", ["#dc2626", "#f97316", "#fbbf24"]
)
t_trans = np.linspace(0, 1, trans_steps - 1)

trans_skip = 30
for i in range(0, trans_steps - 1 - trans_skip, trans_skip):
    color = trans_cmap(t_trans[i])
    ax.plot(
        txs[i : i + trans_skip + 1],
        tys[i : i + trans_skip + 1],
        tzs[i : i + trans_skip + 1],
        color=color,
        alpha=0.9,
        linewidth=2.5,
    )

ax.scatter(
    [txs[0]], [tys[0]], [tzs[0]],
    color="#dc2626", s=150, zorder=10, depthshade=False,
    edgecolors="#991b1b", linewidths=1.5,
)
ax.text(txs[0] + 2, tys[0] - 2, tzs[0] + 2, "Start", color="#dc2626", fontsize=14, fontweight="bold")

plt.savefig("lorenz_raw.png", dpi=150, facecolor=BG, pad_inches=0)
plt.close()

img = Image.open("lorenz_raw.png")
w, h = img.size

band_h = 180
band = Image.new("RGB", (w, band_h), (255, 255, 255))
draw_band = ImageDraw.Draw(band)
draw_band.line([(0, 0), (w, 0)], fill="#e5e7eb", width=2)

try:
    font_eq = ImageFont.truetype("C:/Windows/Fonts/times.ttf", 36)
    font_param = ImageFont.truetype("C:/Windows/Fonts/timesbd.ttf", 36)
    font_title = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 40)
    font_sub = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 24)
except Exception:
    font_eq = font_param = font_title = font_sub = ImageFont.load_default()

eq_color = (31, 41, 55)
param_color = (37, 99, 235)
title_color = (17, 24, 39)
sub_color = (107, 114, 128)

eqs = ["dx/dt = sigma * (y - x)", "dy/dt = x * (rho - z) - y", "dz/dt = x * y - beta * z"]
params = ["sigma = 10", "rho = 28", "beta = 8/3"]

y_start = 20
line_h = 50

for idx, eq in enumerate(eqs):
    draw_band.text((50, y_start + idx * line_h), eq, fill=eq_color, font=font_eq)

for idx, p in enumerate(params):
    draw_band.text((w // 3 + 40, y_start + idx * line_h), p, fill=param_color, font=font_param)

draw_band.text((w * 2 // 3 + 40, y_start), "Lorenz Attractor", fill=title_color, font=font_title)
draw_band.text((w * 2 // 3 + 40, y_start + 50), "Chaotic Attractor", fill=sub_color, font=font_sub)

final = Image.new("RGB", (w, h + band_h), (255, 255, 255))
final.paste(img, (0, 0))
final.paste(band, (0, h))
final.save("lorenz-attractor.png", "PNG", optimize=True)
print(f"Done: {final.size[0]}x{final.size[1]}")
os.remove("lorenz_raw.png")
