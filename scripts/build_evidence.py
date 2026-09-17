"""Reproduce the HCER visualization from the five locked result-summary values.
Source: https://github.com/skrakibulislamrahat/semantic-shift-chest-xray/blob/main/RESULTS.md
Requires matplotlib. No synthetic points or additional task pairs are added.
"""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator
ROOT=Path(__file__).resolve().parent.parent
labels=['Kaggle Pneumonia → RSNA Lung Opacity','Kaggle Pneumonia → CheXpert Consolidation','Kaggle Pneumonia → CheXpert Pneumonia','RSNA Lung Opacity → CheXpert Consolidation','CheXpert Lung Opacity → CheXpert Consolidation']
values=[0.337,0.325,0.199,0.026,0.009]
colors=['#f0bc81','#f0bc81','#ad9aff','#67d8db','#c4f877']
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'svg.fonttype':'none'})
fig,ax=plt.subplots(figsize=(13,5.8),facecolor='#101b27')
ax.set_facecolor('#101b27')
ax.barh(range(5),values,color=colors,height=.45,zorder=3)
ax.set_yticks(range(5),labels,color='#d9e4ea',fontsize=10)
ax.invert_yaxis();ax.set_xlim(0,.4)
ax.xaxis.set_major_locator(MultipleLocator(.1));ax.tick_params(axis='x',colors='#a4b4c4',labelsize=10);ax.tick_params(axis='y',length=0,pad=15)
ax.grid(axis='x',color='#2c3d4b',linewidth=.7,zorder=0)
for spine in ax.spines.values():spine.set_visible(False)
for i,v in enumerate(values):ax.text(v+.008,i,f'{v:.3f}',va='center',color='#eff5f5',fontsize=11)
ax.set_xlabel('High-confidence error rate (HCER)',color='#a4b4c4',labelpad=15)
fig.text(.055,.935,'High-confidence errors after task transfer',color='#eff5f5',fontsize=20,fontweight='bold')
fig.text(.055,.88,'Confidence threshold: 0.90  ·  Selected task pairs  ·  Lower is better',color='#a4b4c4',fontsize=11)
fig.text(.055,.035,'Source: semantic-shift-chest-xray / RESULTS.md · Finalized project result summary',color='#a4b4c4',fontsize=9)
fig.subplots_adjust(left=.43,right=.945,bottom=.19,top=.80)
fig.savefig(ROOT/'assets/research/semantic_hcer_verified.svg',facecolor=fig.get_facecolor())
