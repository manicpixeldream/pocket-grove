# Pocket Grove

Pocket Grove is a browser-local savings tracker and pixel-art pet game. The project uses plain HTML, CSS, and JavaScript, with lit 3D geometry rendered at pixel-art resolution in Canvas.

## Run locally

From this directory, run `python3 -m http.server 8000` and open `http://localhost:8000`. Use the same browser and URL to return to your save.

## Publish on GitHub Pages

Place the contents of this directory at the root of a GitHub repository. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select the branch containing these files, and choose **/ (root)**.

## Play

Choose an egg, create a savings goal, and record the money you set aside. Enter a negative savings record, such as `-5.00`, to subtract money spent from that goal. Complete three goals to hatch your egg and five to reach the growing stage. From there, complete nine goals for one final form, or complete at least seven goals and record savings on four different days for the other.

Goal completion rewards are awarded once per goal. Editing or removing an entry updates the budget figures while previously earned rewards and growth stay with your pet. Grove coins are cosmetic currency.

The settings menu includes the animation toggle and JSON export, import, and reset. A backup includes your manually entered budget records. Progress is stored per browser and site address.

## Source

- `index.html` defines the page and accessibility landmarks.
- `css/style.css` holds the responsive layouts and styling.
- `js/data.js` defines the eggs, unlocks, achievements, and items.
- `js/art.js` draws the habitat, creatures, effects, and equipped items.
- `js/game.js` handles budget records, progression, UI actions, and saves.
