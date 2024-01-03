export interface ButtonProps {
    label: string;
    onClick: () => void;
    type?: 'primary' | 'secondary' | 'accent';
}

export default function Button({label, onClick, type='primary'}: ButtonProps) {
    let btnTypeClassNames = "";
    switch(type) {
        case 'primary':
            btnTypeClassNames = "bg-green-600";
            break;
        default:
            btnTypeClassNames = "bg-red-600";
    }
    return (
        <button className={`${btnTypeClassNames} p-2 rounded text-white`} onClick={onClick}>
            {label}
        </button>
    );
}