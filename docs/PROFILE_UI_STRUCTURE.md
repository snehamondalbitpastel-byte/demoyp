# User Profile — File & Folder Structure (with CSS modules)

Structure of the user (auth) profile UI. Each component sits with its own `.module.css`, so styles are next to the component. **All profile dropdowns are the shared `SelectField` component → its styles are in `SelectField.module.css`.**

---

## Profile page
```
src/app/profile/[id]/
├── page.tsx                 ← the profile screen
└── profile.module.css       ← profile page styles
```

## Profile edit modals
```
src/app/components/profile/
├── EditProfileInfoModal/
│   ├── EditProfileInfoModal.tsx        (has dropdowns: Location, Gender)
│   └── EditProfileInfoModal.module.css
├── EditEducationModal/
│   ├── EditEducationModal.tsx          (has dropdowns: University, Degree, Start/End Year)
│   └── EditEducationModal.module.css
├── EditSkillsModal/
│   ├── EditSkillsModal.tsx             (dropdown: Skills — multi-select)
│   └── EditSkillsModal.module.css
├── EditAboutModal/
│   ├── EditAboutModal.tsx
│   └── EditAboutModal.module.css
├── UploadPhotoModal/
│   ├── UploadPhotoModal.tsx
│   └── UploadPhotoModal.module.css
├── ImagePreviewModal/
│   ├── ImagePreviewModal.tsx
│   └── ImagePreviewModal.module.css
└── ConfirmDialog/
    ├── ConfirmDialog.tsx
    └── ConfirmDialog.module.css
```

## Shared UI fields (dropdowns / inputs)
```
src/app/components/ui/
├── SelectField/                    ←★ the dropdown (used by ALL profile dropdowns)
│   ├── SelectField.tsx
│   └── SelectField.module.css      ←★ dropdown styles live here
├── DatePicker/                     ← the Date of Birth calendar dropdown
│   ├── DatePicker.tsx
│   └── DatePicker.module.css       ← date-picker styles
├── PhoneInputField/
│   ├── PhoneInputField.tsx
│   └── PhoneInputField.module.css
├── InputField/
│   ├── InputField.tsx
│   └── InputField.module.css
├── SelectField/ …
└── Button/
    ├── Button.tsx
    └── Button.module.css
```

---

## Where the dropdown styles are

| Dropdown | Styles file |
|---|---|
| All select dropdowns (Location, Gender, University, Degree, Years, Skills) | `src/app/components/ui/SelectField/SelectField.module.css` |
| Date of Birth (calendar) | `src/app/components/ui/DatePicker/DatePicker.module.css` |

> To restyle any profile dropdown, edit **`SelectField.module.css`** — one file styles them all.
