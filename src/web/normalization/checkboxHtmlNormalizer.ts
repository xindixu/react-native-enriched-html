/*
 * TipTap format for checkboxes (TaskItem / Checkbox extension output):
 *   <ul data-type="checkboxList">
 *     <li data-checked="true|false" data-type="checkboxItem">
 *       <label><input type="checkbox" checked="checked"><span></span></label>
 *       <div><p>…</p></div>
 *     </li>
 *   </ul>
 *
 * Native format for checkboxes:
 *   <ul data-type="checkbox">
 *     <li>…</li>
 *     <li checked>…</li>
 *   </ul>
 */
export function checkboxHtmlForTiptap(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('ul[data-type="checkbox"]').forEach((ul) => {
    ul.setAttribute('data-type', 'checkboxList');

    Array.from(ul.children)
      .filter((el) => el.tagName === 'LI')
      .forEach((li) => {
        li.setAttribute('data-type', 'checkboxItem');

        if (li.hasAttribute('checked')) {
          li.setAttribute('data-checked', 'true');
          li.removeAttribute('checked');
        } else {
          li.setAttribute('data-checked', 'false');
        }

        if (li.firstElementChild?.tagName !== 'P') {
          const paragraph = doc.createElement('p');
          while (
            li.firstChild &&
            !(
              li.firstChild instanceof Element &&
              ['UL', 'OL'].includes(li.firstChild.tagName)
            )
          ) {
            paragraph.appendChild(li.firstChild);
          }
          li.prepend(paragraph);
        }
      });
  });

  return doc.body.innerHTML;
}

export function checkboxHtmlFromTiptap(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  doc.querySelectorAll('ul[data-type="checkboxList"]').forEach((ul) => {
    ul.setAttribute('data-type', 'checkbox');

    Array.from(ul.children)
      .filter((el) => el.tagName === 'LI')
      .forEach((li) => {
        if (li.getAttribute('data-checked') === 'true') {
          li.setAttribute('checked', '');
        } else {
          li.removeAttribute('checked');
        }

        li.removeAttribute('data-type');
        li.removeAttribute('data-checked');

        for (const child of Array.from(li.children)) {
          if (child.tagName === 'LABEL') child.remove();
          if (child.tagName === 'DIV') child.replaceWith(...child.childNodes);
        }
      });
  });

  return doc.body.innerHTML.replace(/checked=""/g, 'checked');
}
