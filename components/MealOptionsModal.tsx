import React, { useState, useEffect } from 'react';
import { MenuItem, MealOption, SelectedOption } from '../types/index';
import { Button3D } from './ui/Button3D';
import { X, Check, AlignLeft } from 'lucide-react';

interface MealOptionsModalProps {
  item: MenuItem;
  onClose: () => void;
  onConfirm: (options: SelectedOption[]) => void;
}

export const MealOptionsModal: React.FC<MealOptionsModalProps> = ({ item, onClose, onConfirm }) => {
  const availableOptions: MealOption[] = item.meal_options ?? [];
  const mandatoryOptions = availableOptions.filter((o) => o.is_mandatory);
  const optionalOptions  = availableOptions.filter((o) => !o.is_mandatory);
  const hasMandatory     = mandatoryOptions.length > 0;

  const [mandatorySelection, setMandatorySelection] = useState<string | null>(null);
  const [optionalSelections, setOptionalSelections] = useState<Set<string>>(new Set());
  const [manualNote, setManualNote]                 = useState('');

  useEffect(() => {
    setMandatorySelection(null);
    setOptionalSelections(new Set());
    setManualNote('');
  }, [item.id]);

  const isValid = !hasMandatory || mandatorySelection !== null;

  const currentPriceModifier =
    (mandatorySelection ? mandatoryOptions.find((o) => o.id === mandatorySelection)?.price_modifier ?? 0 : 0) +
    Array.from(optionalSelections).reduce(
      (sum, id) => sum + (optionalOptions.find((o) => o.id === id)?.price_modifier ?? 0),
      0
    );

  const toggleOptional = (id: string) => {
    const next = new Set(optionalSelections);
    next.has(id) ? next.delete(id) : next.add(id);
    setOptionalSelections(next);
  };

  const handleConfirm = () => {
    if (!isValid) return;
    const finalOptions: SelectedOption[] = [];

    if (mandatorySelection) {
      const opt = mandatoryOptions.find((o) => o.id === mandatorySelection);
      if (opt) finalOptions.push({ id: opt.id, name: opt.name, type: 'mandatory', price_modifier: opt.price_modifier });
    }

    optionalSelections.forEach((id) => {
      const opt = optionalOptions.find((o) => o.id === id);
      if (opt) finalOptions.push({ id: opt.id, name: opt.name, type: 'optional', price_modifier: opt.price_modifier });
    });

    if (manualNote.trim()) {
      finalOptions.push({ name: `Note: ${manualNote.trim()}`, type: 'manual', price_modifier: 0 });
    }

    onConfirm(finalOptions);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 bg-uvci-purple text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X size={20} />
          </button>
          <h3 className="text-2xl font-extrabold pr-8 leading-tight">{item.name}</h3>
          <p className="text-white/80 font-medium mt-1">{item.price} FCFA</p>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-gray-50 flex-1">

          {hasMandatory && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-uvci-purple rounded-full" />
                Choisissez votre accompagnement <span className="text-red-500">*</span>
              </h4>
              <div className="space-y-2">
                {mandatoryOptions.map((opt) => (
                  <label key={opt.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${mandatorySelection === opt.id ? 'border-uvci-purple bg-uvci-purple/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${mandatorySelection === opt.id ? 'border-uvci-purple' : 'border-gray-300'}`}>
                        {mandatorySelection === opt.id && <div className="w-2.5 h-2.5 bg-uvci-purple rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{opt.name}</span>
                    </div>
                    {opt.price_modifier > 0 && <span className="text-xs font-bold text-uvci-purple">+{opt.price_modifier} F</span>}
                    <input type="radio" name="mandatory" className="hidden" checked={mandatorySelection === opt.id} onChange={() => setMandatorySelection(opt.id)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {optionalOptions.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-uvci-green rounded-full" />
                Suppléments (Optionnel)
              </h4>
              <div className="space-y-2">
                {optionalOptions.map((opt) => (
                  <label key={opt.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${optionalSelections.has(opt.id) ? 'border-uvci-green bg-green-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${optionalSelections.has(opt.id) ? 'bg-uvci-green border-uvci-green' : 'border-gray-300 bg-white'}`}>
                        {optionalSelections.has(opt.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{opt.name}</span>
                    </div>
                    {opt.price_modifier > 0 && <span className="text-xs font-bold text-uvci-green">+{opt.price_modifier} F</span>}
                    <input type="checkbox" className="hidden" checked={optionalSelections.has(opt.id)} onChange={() => toggleOptional(opt.id)} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlignLeft size={18} className="text-gray-400" /> Instructions spéciales
            </h4>
            <textarea
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              placeholder="Ex: Sans oignons, sauce à part..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple min-h-[80px]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="text-gray-500 font-medium text-sm">Total article</span>
            <span className="text-xl font-black text-uvci-purple">{item.price + currentPriceModifier} <span className="text-xs text-gray-400">FCFA</span></span>
          </div>
          <Button3D onClick={handleConfirm} disabled={!isValid} fullWidth variant={isValid ? 'primary' : 'ghost'}>
            {isValid ? 'Confirmer et Ajouter' : 'Sélectionnez les options requises'}
          </Button3D>
        </div>
      </div>
    </div>
  );
};
